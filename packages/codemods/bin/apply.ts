import chalk from 'chalk';
import type { Command } from 'commander';
import { Option } from 'commander';
import ignore from 'ignore';
import jscodeshift from 'jscodeshift';
import path from 'path';

import type { Options as LegacyCompatBuildersOptions } from '../src/legacy-compat-builders/options.js';
import { type ConfigOptions,loadConfig, mergeOptions } from '../src/schema-migration/utils/config.js';
import type { SharedCodemodOptions } from '../src/utils/options.js';
import { logger } from '../utils/logger.js';
import type { CodemodConfig } from './config.js';


export function createApplyCommand(program: Command, codemods: CodemodConfig[]) {
  const applyCommand = program.command('apply').description('apply the given codemod to the target file paths');

  const commands = new Map<string, Command>();
  // Add arguments that will be used for all codemods
  for (const codemod of codemods) {
    const command = applyCommand.command(`${codemod.name}`).description(codemod.description);

    // migrate-to-schema has different arguments
    if (codemod.name === 'migrate-to-schema') {
      command.argument('[input-dir]', 'Input directory to search for models and mixins', './app');
    } else {
      command.argument(
        '<target-glob-pattern...>',
        'Path to files or glob pattern. If using glob pattern, wrap in single quotes.'
      );
    }

    command
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


  // Add arguments that are specific to the migrate-to-schema codemod
  const migrateToSchema = commands.get('migrate-to-schema');
  if (migrateToSchema) {
    migrateToSchema
      .addOption(new Option('--config <path>', 'Path to configuration file'))
      .addOption(new Option('--models-only', 'Only process model files').default(false))
      .addOption(new Option('--mixins-only', 'Only process mixin files').default(false))
      .addOption(new Option('--skip-processed', 'Skip files that have already been processed').default(false))
      .addOption(new Option('--model-source-dir <path>', 'Directory containing model files').default('./app/models'))
      .addOption(new Option('--mixin-source-dir <path>', 'Directory containing mixin files').default('./app/mixins'))
      .addOption(new Option('--output-dir <path>', 'Output directory for generated schemas').default('./app/schemas'));
  }
}

function createApplyAction(transformName: string) {
  return async (patterns: string[] | string, options: SharedCodemodOptions & Record<string, unknown>) => {
    logger.config(options);
    const log = logger.for(transformName);

    // Special handling for migrate-to-schema command
    if (transformName === 'migrate-to-schema') {
      const { runMigration } = await import('../src/schema-migration/migrate-to-schema.js');
      const inputDir = (typeof patterns === 'string' ? patterns : patterns[0]) || './app';

      // Load and merge config file if provided
      let configOptions = {};
      if (options.config) {
        try {
          configOptions = loadConfig(String(options.config));
          log.info(`Loaded configuration from: ${options.config}`);
        } catch (error) {
          log.error(`Failed to load config file: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      }

      // Merge CLI options with config options (CLI takes precedence)
      const cliOptions = {
        ...options,
        inputDir,
        dryRun: Boolean(options.dry),
        verbose: options.verbose === '1' || options.verbose === '2',
        debug: Boolean(options.debug),
        modelsOnly: Boolean(options.modelsOnly),
        mixinsOnly: Boolean(options.mixinsOnly),
        skipProcessed: Boolean(options.skipProcessed),
        modelSourceDir: String(options.modelSourceDir || './app/models'),
        mixinSourceDir: String(options.mixinSourceDir || './app/mixins'),
        outputDir: String(options.outputDir || './app/schemas'),
        // Ensure intermediateModelPaths is an array if provided
        intermediateModelPaths: Array.isArray(options.intermediateModelPaths)
          ? options.intermediateModelPaths
          : options.intermediateModelPaths ? [options.intermediateModelPaths] : undefined,
      };
      const migrationOptions = mergeOptions(cliOptions, configOptions);

      try {
        await runMigration(migrationOptions);
        log.success('Migration completed successfully! 🎉');
      } catch (error) {
        log.error('Migration failed:', error instanceof Error ? error.message : String(error));
        throw error;
      }
      return;
    }

    // Load and merge config file for other transforms
    let finalOptions: SharedCodemodOptions & ConfigOptions = options as SharedCodemodOptions & ConfigOptions;
    if (options.config) {
      try {
        const configOptions = loadConfig(String(options.config));
        log.info(`Loaded configuration from: ${options.config}`);
        // Normalize CLI options before merging (convert types to match ConfigOptions)
        const normalizedCliOptions = {
          ...options,
          debug: Boolean(options.debug),
          verbose: options.verbose === '1' || options.verbose === '2', // Convert string to boolean
          // Ensure intermediateModelPaths is an array if provided
          intermediateModelPaths: Array.isArray(options.intermediateModelPaths)
            ? options.intermediateModelPaths
            : options.intermediateModelPaths ? [options.intermediateModelPaths] : undefined,
        };
        // mergeOptions preserves the CLI type structure while merging config
        finalOptions = mergeOptions(normalizedCliOptions as ConfigOptions, configOptions) as typeof finalOptions;
      } catch (error) {
        log.error(`Failed to load config file: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    log.debug('Running with options:', { targetGlobPattern: patternArray, ...finalOptions });
    const ig = ignore().add(['**/*.d.ts', '**/node_modules/**/*', '**/dist/**/*', ...(finalOptions.ignore ?? [])]);

    log.debug('Running for paths:', Bun.inspect(patternArray));
    if (finalOptions.dry) {
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

    for (const pattern of patternArray) {
      const glob = new Bun.Glob(pattern);
      for await (const filepath of glob.scan('.')) {
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
            // Options are properly typed per transform in CLI setup,
            // but JSCodeshift generic API requires flexible typing
            finalOptions as SharedCodemodOptions & LegacyCompatBuildersOptions
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
          if (finalOptions.dry) {
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
      log.warn('No files matched the provided glob pattern(s):', patternArray);
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
