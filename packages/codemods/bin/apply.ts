import chalk from 'chalk';
import type { Command } from 'commander';
import { Option } from 'commander';
import ignore from 'ignore';
import jscodeshift from 'jscodeshift';
import path from 'path';

import type { SharedCodemodOptions as Options } from '../src/utils/options.js';
import { logger } from '../utils/logger.js';
import type { CodemodConfig } from './config.js';

export function createApplyCommand(program: Command, codemods: CodemodConfig[]) {
  const applyCommand = program.command('apply').description('apply the given codemod to the target file paths');

  const commands = new Map<string, Command>();
  // Add arguments that will be used for all codemods
  for (const codemod of codemods) {
    const command = applyCommand
      .command(`${codemod.name}`)
      .description(codemod.description)
      .argument(
        '<target-glob-pattern...>',
        'Path to files or glob pattern. If using glob pattern, wrap in single quotes.'
      )
      .addOption(new Option('-d, --dry', 'dry run (no changes are made to files)').default(false))
      .addOption(
        new Option('-v, --verbose <level>', 'Show more information about the transform process')
          .choices(['0', '1', '2'])
          .default('0')
      )
      .addOption(
        new Option(
          '-l, --log-file [path]',
          'Write logs to a file. If option is set but no path is provided, logs are written to ember-data-codemods.log'
        )
      )
      .addOption(
        new Option(
          '-i, --ignore <ignore-glob-pattern...>',
          'Ignores the given file or glob pattern. If using glob pattern, wrap in single quotes.'
        )
      )
      .allowUnknownOption() // to passthrough jscodeshift options
      .action(createApplyAction(codemod.name));
    commands.set(codemod.name, command);
  }

  // Add arguments that are specific to the legacy-compat-builders codemod
  const legacyCompatBuilders = commands.get('legacy-compat-builders');
  if (!legacyCompatBuilders) {
    throw new Error('No codemod found for: legacy-compat-builders');
  }
  legacyCompatBuilders
    .addOption(
      new Option(
        '--store-names <store-name...>',
        "Identifier name associated with the store. If overriding, it is recommended that you include 'store' in your list."
      ).default(['store'])
    )
    .addOption(
      new Option(
        '--method, --methods <method-name...>',
        'Method name(s) to transform. By default, will transform all methods.'
      ).choices(['findAll', 'findRecord', 'query', 'queryRecord', 'saveRecord'])
    );
}

function createApplyAction(transformName: string) {
  return async (patterns: string[], options: Options & Record<string, unknown>) => {
    logger.config(options);
    const log = logger.for(transformName);

    log.debug('Running with options:', { targetGlobPattern: patterns, ...options });
    // @ts-expect-error Ignore types don't work?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const ig = ignore()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .add(['**/*.d.ts', '**/node_modules/**/*', '**/dist/**/*', ...(options.ignore ?? [])]);

    log.debug('Running for paths:', Bun.inspect(patterns));
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

    for (const pattern of patterns) {
      const glob = new Bun.Glob(pattern);
      for await (const filepath of glob.scan('.')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        if (ig.ignores(path.join(filepath))) {
          log.warn('Skipping ignored file:', filepath);
          result.skipped++;
          continue;
        }
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
            // SAFETY: This isn't safe TBH. YOLO
            options as Parameters<typeof transform>[2]
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
    }

    if (result.matches === 0) {
      log.warn('No files matched the provided glob pattern(s):', patterns);
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
