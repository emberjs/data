import type { API, FileInfo } from 'jscodeshift';
import { existsSync, mkdirSync } from 'fs';
import { glob } from 'glob';
import { resolve, join } from 'path';
import { processIntermediateModelsToTraits } from './model-to-schema.js';
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

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Process each file
  for (const filePath of filesToProcess) {
    try {
      if (finalOptions.verbose) {
        console.log(`🔄 Processing: ${filePath}`);
      }

      // Determine if this is a model or mixin file and process accordingly
      if (filePath.includes('/models/') || isModelFile(filePath)) {
        const result = processIntermediateModelsToTraits(
          [filePath], // Pass as array of paths
          finalOptions.additionalModelSources || [], // Pass additionalModelSources
          finalOptions.additionalMixinSources || [], // Pass additionalMixinSources
          finalOptions // Pass options
        );
        if (result.artifacts && result.artifacts.length > 0) {
          processed++;
        } else {
          skipped++;
        }
      } else if (filePath.includes('/mixins/') || isMixinFile(filePath)) {
        // For now, mixin processing is placeholder
        // In a full implementation, this would call the mixin transform
        console.log(`⚠️  Mixin processing not fully implemented: ${filePath}`);
        skipped++;
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   📊 Processed: ${processed} files`);
  console.log(`   ⏭️  Skipped: ${skipped} files`);
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
