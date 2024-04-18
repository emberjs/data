import chalk from 'chalk';
import type { Command } from 'commander';
import { Option } from 'commander';
import type { Options } from 'jscodeshift';
import jscodeshift from 'jscodeshift';

import { logger } from '../utils/logger.js';
import type { CodemodConfig } from './config.js';

export function createApplyCommand(program: Command, codemods: CodemodConfig[]) {
  const applyCommand = program
    .command('apply')
    .argument('<codemod>', 'name of the codemod to apply (see `list` command for available codemods)')
    .argument('<target-glob-pattern...>', 'path to files or glob pattern')
    .description('apply the given codemod to the target file paths');

  for (const codemod of codemods) {
    applyCommand
      .command(`${codemod.name}`)
      .description(codemod.description)
      .argument('<target-glob-pattern...>', 'Path to files or glob pattern')
      .addOption(
        new Option('-v, --verbose <level>', 'show more information about the transform process')
          .choices(['0', '1', '2'])
          .default('0')
      )
      .allowUnknownOption() // to passthrough jscodeshift options
      .action(createApplyAction(codemod.name));
  }
}

function createApplyAction(transformName: string) {
  return async (patterns: string[], options: Options) => {
    logger.config(options);
    const log = logger.for(transformName);

    log.debug('Running with options:', options);
    log.debug('Running for target-glob-patterns:', patterns);

    // const transformPath = await import.meta.resolve(`../src/${transformName}/index.ts`);
    const codemods = (await import('../src/index.js')).default;
    if (!(transformName in codemods)) {
      throw new Error(`No codemod found for: ${transformName}`);
    }
    const transform = codemods[transformName as keyof typeof codemods];

    /**
     * | Result       | How-to                      | Meaning                                            |
     * | :------      | :------                     | :-------                                           |
     * | `errors`     | `throw`                     | we attempted to transform but encountered an error |
     * | `unmodified` | return `string` (unchanged) | we attempted to transform but it was unnecessary   |
     * | `skipped`    | return `undefined`          | we did not attempt to transform                    |
     * | `ok`         | return `string` (changed)   | we successfully transformed                        |
     */
    const result = {
      errors: 0,
      unmodified: 0,
      skipped: 0,
      ok: 0,
    };

    for (const pattern of patterns) {
      const glob = new Bun.Glob(pattern);
      for await (const filePath of glob.scan('.')) {
        log.debug('Transforming:', filePath);
        const file = Bun.file(filePath);
        const originalSource = await file.text();
        options.dry = true;
        let transformedSource: string | undefined;
        try {
          transformedSource = transform(
            { source: originalSource, path: filePath },
            {
              j: jscodeshift,
              jscodeshift,
              stats: (_name: string, _quantity?: number): void => {}, // unused
              report: (_msg: string): void => {}, // unused
            },
            options
          );
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'TransformError') {
            result.errors++;
            log.error(`Error transforming ${filePath}:\n`, error);
          } else {
            throw error;
          }
          continue;
        }

        if (transformedSource === undefined) {
          result.skipped++;
        } else if (transformedSource === originalSource) {
          result.unmodified++;
        } else {
          result.ok++;
          await Bun.write(filePath, transformedSource);
        }
      }
    }

    if (result.errors > 0) {
      log.log(chalk.red(`${result.errors} error(s). See logs above.`));
    } else {
      log.success('Zero errors! 🎉');
    }
    if (result.skipped > 0) {
      log.log(chalk.yellow(`${result.skipped} skipped file(s).`, chalk.gray('Transform did not run. See logs above.')));
    }
    if (result.unmodified > 0) {
      log.log(`${result.unmodified} unmodified file(s).`, chalk.gray('Transform ran but no changes were made.'));
    }
    if (result.ok > 0) {
      log.log(chalk.green(`${result.ok} transformed file(s).`));
    }
  };
}
