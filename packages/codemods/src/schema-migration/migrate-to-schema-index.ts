import type { API, FileInfo } from 'jscodeshift';
import { existsSync, mkdirSync } from 'fs';
import { glob } from 'glob';
import { resolve, join, dirname } from 'path';
import modelTransform, { processIntermediateModelsToTraits } from './model-to-schema.js';
import mixinTransform from './mixin-to-schema.js';
import type { TransformOptions } from './utils/ast-utils.js';

interface MigrateOptions extends Partial<TransformOptions> {
  mixinsOnly?: boolean;
  modelsOnly?: boolean;
  skipProcessed?: boolean;
  inputDir?: string;
  modelSourceDir?: string;
  mixinSourceDir?: string;
}

/**
 * Combined transform that migrates both models and mixins to schemas
 * This is equivalent to the original "migrate" command
 */
export default function (fileInfo: FileInfo, api: API, options: MigrateOptions = {}): string | undefined {
  // This transform doesn't operate on individual files
  // Instead it runs a batch migration
  throw new Error(
    'migrate-to-schema should be run as a batch operation, not on individual files. Use the CLI command directly.'
  );
}

/**
 * Run the migration for multiple files
 */
export async function runMigration(options: MigrateOptions): Promise<void> {
  const finalOptions: TransformOptions = {
    inputDir: options.inputDir || './app',
    outputDir: options.outputDir || './app/schemas',
    dryRun: options.dryRun || false,
    verbose: options.verbose || false,
    modelSourceDir: options.modelSourceDir || './app/models',
    mixinSourceDir: options.mixinSourceDir || './app/mixins',
    ...options,
  };

  console.log(`🚀 Starting schema migration...`);
  console.log(`📁 Input directory: ${resolve(finalOptions.inputDir)}`);
  console.log(`📁 Output directory: ${resolve(finalOptions.outputDir)}`);

  // Ensure output directories exist
  if (!finalOptions.dryRun) {
    mkdirSync(resolve(finalOptions.outputDir), { recursive: true });
    if (finalOptions.traitsDir) {
      mkdirSync(resolve(finalOptions.traitsDir), { recursive: true });
    }
    if (finalOptions.extensionsDir) {
      mkdirSync(resolve(finalOptions.extensionsDir), { recursive: true });
    }
    if (finalOptions.resourcesDir) {
      mkdirSync(resolve(finalOptions.resourcesDir), { recursive: true });
    }
  }

  const filesToProcess: string[] = [];

  // Discover model files
  if (!options.mixinsOnly) {
    const modelPattern = join(resolve(finalOptions.modelSourceDir || './app/models'), '**/*.{js,ts}');
    const modelFiles = await glob(modelPattern);
    filesToProcess.push(
      ...modelFiles.filter(
        (file) => existsSync(file) && (!options.skipProcessed || !isAlreadyProcessed(file, finalOptions))
      )
    );

    if (finalOptions.verbose) {
      console.log(`📋 Found ${modelFiles.length} model files`);
    }
  }

  // Discover mixin files
  if (!options.modelsOnly) {
    const mixinPattern = join(resolve(finalOptions.mixinSourceDir || './app/mixins'), '**/*.{js,ts}');
    const mixinFiles = await glob(mixinPattern);
    filesToProcess.push(
      ...mixinFiles.filter(
        (file) => existsSync(file) && (!options.skipProcessed || !isAlreadyProcessed(file, finalOptions))
      )
    );

    if (finalOptions.verbose) {
      console.log(`📋 Found ${mixinFiles.length} mixin files`);
    }
  }

  if (filesToProcess.length === 0) {
    console.log('✅ No files found to process.');
    return;
  }

  console.log(`📋 Processing ${filesToProcess.length} files total`);

  // Separate model and mixin files
  const modelFiles = filesToProcess.filter((file) => file.includes('/models/') || isModelFile(file));
  const mixinFiles = filesToProcess.filter((file) => file.includes('/mixins/') || isMixinFile(file));

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Process model files individually using the model transform
  for (const filePath of modelFiles) {
    try {
      if (finalOptions.verbose) {
        console.log(`🔄 Processing: ${filePath}`);
      }

      const source = existsSync(filePath) ? require('fs').readFileSync(filePath, 'utf-8') : '';
      if (!source) {
        console.error(`❌ Could not read file: ${filePath}`);
        errors++;
        continue;
      }

      // Apply the model transform
      const transformed = modelTransform(filePath, source, finalOptions);

      if (transformed !== source) {
        processed++;

        // Generate output file path in resourcesDir instead of modifying original file
        const outputDir = finalOptions.resourcesDir || finalOptions.outputDir || './app/data/resources';
        const relativePath = filePath.replace(resolve(finalOptions.modelSourceDir || './app/models'), '');
        const outputPath = join(resolve(outputDir), relativePath);

        if (!finalOptions.dryRun) {
          // Ensure output directory exists
          const outputDirPath = dirname(outputPath);
          if (!existsSync(outputDirPath)) {
            require('fs').mkdirSync(outputDirPath, { recursive: true });
          }

          require('fs').writeFileSync(outputPath, transformed, 'utf-8');
          if (finalOptions.verbose) {
            console.log(`✅ Generated: ${outputPath}`);
          }
        } else if (finalOptions.verbose) {
          console.log(`✅ Would generate: ${outputPath} (dry run)`);
        }
      } else {
        skipped++;
        if (finalOptions.verbose) {
          console.log(`⏭️  Skipped (no changes needed): ${filePath}`);
        }
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  // Process mixin files (only model mixins will be transformed)
  for (const filePath of mixinFiles) {
    try {
      if (finalOptions.verbose) {
        console.log(`🔄 Processing: ${filePath}`);
      }

      const source = existsSync(filePath) ? require('fs').readFileSync(filePath, 'utf-8') : '';
      if (!source) {
        console.error(`❌ Could not read file: ${filePath}`);
        errors++;
        continue;
      }

      // Apply the mixin transform
      const transformed = mixinTransform(filePath, source, finalOptions);

      if (transformed !== source) {
        processed++;

        // Generate output file path in traitsDir instead of modifying original file
        const outputDir = finalOptions.traitsDir || './app/data/traits';
        const relativePath = filePath.replace(resolve(finalOptions.mixinSourceDir || './app/mixins'), '');
        const outputPath = join(resolve(outputDir), relativePath);

        if (!finalOptions.dryRun) {
          // Ensure output directory exists
          const outputDirPath = dirname(outputPath);
          if (!existsSync(outputDirPath)) {
            require('fs').mkdirSync(outputDirPath, { recursive: true });
          }

          require('fs').writeFileSync(outputPath, transformed, 'utf-8');
          if (finalOptions.verbose) {
            console.log(`✅ Generated: ${outputPath}`);
          }
        } else if (finalOptions.verbose) {
          console.log(`✅ Would generate: ${outputPath} (dry run)`);
        }
      } else {
        skipped++;
        if (finalOptions.verbose) {
          console.log(`⏭️  Skipped (not a model mixin): ${filePath}`);
        }
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   📊 Processed: ${processed} files`);
  console.log(`   ⏭️  Skipped: ${skipped} files (not applicable for transformation)`);
  if (errors > 0) {
    console.log(`   ❌ Errors: ${errors} files`);
  }
}

/**
 * Check if a file has already been processed
 */
function isAlreadyProcessed(filePath: string, options: TransformOptions): boolean {
  // Simple heuristic: check if a corresponding schema file exists
  const outputPath = filePath
    .replace('/models/', '/schemas/')
    .replace('/mixins/', '/traits/')
    .replace(/\.(js|ts)$/, '.ts');

  return existsSync(outputPath);
}

/**
 * Determine if a file is a model file based on content
 */
function isModelFile(filePath: string): boolean {
  try {
    const content = require('fs').readFileSync(filePath, 'utf-8');
    return content.includes('DS.Model') || content.includes('@ember-data/model') || content.includes('Model.extend');
  } catch {
    return false;
  }
}

/**
 * Determine if a file is a mixin file based on content
 */
function isMixinFile(filePath: string): boolean {
  try {
    const content = require('fs').readFileSync(filePath, 'utf-8');
    return (
      content.includes('Ember.Mixin') || content.includes('@ember/object/mixin') || content.includes('Mixin.create')
    );
  } catch {
    return false;
  }
}
