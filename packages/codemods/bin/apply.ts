import chalk from 'chalk';
import type { Command } from 'commander';
import { Option } from 'commander';
import ignore from 'ignore';
import jscodeshift from 'jscodeshift';
import path from 'path';

import type { Options } from '../src/legacy-compat-builders/options.js';
import { logger } from '../utils/logger.js';
import type { CodemodConfig } from './config.js';

export function createApplyCommand(program: Command, codemods: CodemodConfig[]) {
  const applyCommand = program
    .command('apply')
    .argument('<target-glob-pattern...>', 'path to files or glob pattern')
    .description('apply the given codemod to the target file paths');

  for (const codemod of codemods) {
    applyCommand
      .command(`${codemod.name}`)
      .description(codemod.description)
      .argument('<target-glob-pattern...>', 'Path to files or glob pattern')
      .addOption(new Option('-d, --dry', 'dry run (no changes are made to files)').default(false))
      .addOption(
        new Option('-v, --verbose <level>', 'show more information about the transform process')
          .choices(['0', '1', '2'])
          .default('0')
      )
      .addOption(
        new Option(
          '-l, --log-file [path]',
          'write logs to a file. If option is set but no path is provided, logs are written to ember-data-codemods.log'
        )
      )
      .addOption(new Option('-i, --ignore <ignore-glob-pattern...>', 'ignores the given glob patterns'))
      .allowUnknownOption() // to passthrough jscodeshift options
      .action(createApplyAction(codemod.name));
  }
}

function createApplyAction(transformName: string) {
  return async (paths: string[], options: Options) => {
    logger.config(options);
    const log = logger.for(transformName);

    log.debug('Running with options:', { paths, ...options });
    // @ts-expect-error Ignore types don't work?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    paths = ignore()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .add(['**/*.d.ts', '**/node_modules/**/*', ...(options.ignore ?? [])])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .filter(paths.map((p) => path.join(p)));

    log.debug('Running for paths:', Bun.inspect(paths));
    if (options.dry) {
      log.warn('Running in dry mode. No files will be modified.');
    }

    const { Codemods } = await import('../src/index.js');
    if (!(transformName in Codemods)) {
      throw new Error(`No codemod found for: ${transformName}`);
    }
    const transform = Codemods[transformName as keyof typeof Codemods];

    /**
     * | Result       | How-to                      | Meaning                                            |
     * | :------      | :------                     | :-------                                           |
     * | `errors`     | `throw`                     | we attempted to transform but encountered an error |
     * | `unmodified` | return `string` (unchanged) | we attempted to transform but it was unnecessary   |
     * | `skipped`    | return `undefined`          | we did not attempt to transform                    |
     * | `ok`         | return `string` (changed)   | we successfully transformed                        |
     */
    const result = {
      matches: 0,
      errors: 0,
      unmodified: 0,
      skipped: 0,
      ok: 0,
    };
    const j = jscodeshift.withParser('ts');

    for (const filepath of paths) {
      log.debug('Transforming:', filepath);
      result.matches++;
      const file = Bun.file(filepath);
      const originalSource = await file.text();
      let transformedSource: string | undefined;
      try {
        transformedSource = transform(
          { source: originalSource, path: filepath },
          {
            j,
            jscodeshift: j,
            stats: (_name: string, _quantity?: number): void => {}, // unused
            report: (_msg: string): void => {}, // unused
          },
          options
        );
      } catch (error) {
        result.errors++;
        log.error({
          filepath,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        continue;
      }

      if (transformedSource === undefined) {
        result.skipped++;
      } else if (transformedSource === originalSource) {
        result.unmodified++;
      } else {
        if (options.dry) {
          log.info({
            filepath,
            message: 'Transformed source:\n\t' + transformedSource,
          });
        } else {
          await Bun.write(filepath, transformedSource);
        }
        result.ok++;
      }
    }

    if (result.matches === 0) {
      log.warn('No files matched the provided glob pattern(s):', paths);
    }

    if (result.errors > 0) {
      log.info(chalk.red(`${result.errors} error(s). See logs above.`));
    } else if (result.matches > 0) {
      log.success('Zero errors! 🎉');
    }
    if (result.skipped > 0) {
      log.info(
        chalk.yellow(`${result.skipped} skipped file(s).`, chalk.gray('Transform did not run. See logs above.'))
      );
    }
    if (result.unmodified > 0) {
      log.info(`${result.unmodified} unmodified file(s).`, chalk.gray('Transform ran but no changes were made.'));
    }
    if (result.ok > 0) {
      log.info(chalk.green(`${result.ok} transformed file(s).`));
    }
  };
}
