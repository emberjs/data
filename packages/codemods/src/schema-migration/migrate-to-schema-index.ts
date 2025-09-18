import type { API, FileInfo } from 'jscodeshift';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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
 * Analyze which mixins are actually used by models (directly or transitively)
 */
async function analyzeModelMixinUsage(options: TransformOptions): Promise<Set<string>> {
  const modelMixins = new Set<string>();

  // Find all model files and extract their mixin dependencies
  const modelPattern = join(resolve(options.modelSourceDir || './app/models'), '**/*.{js,ts}');
  const modelFiles = await glob(modelPattern);

  // Find all mixin files and extract their mixin dependencies
  const mixinPattern = join(resolve(options.mixinSourceDir || './app/mixins'), '**/*.{js,ts}');
  const mixinFiles = await glob(mixinPattern);

  // Build mixin dependency graph
  const mixinDependencies = new Map<string, Set<string>>();

  if (options.verbose) {
    console.log(`🔍 Analyzing mixin usage relationships...`);
    console.log(`📊 Found ${modelFiles.length} models and ${mixinFiles.length} mixins`);
  }

  // Analyze model files for direct mixin usage
  let modelsProcessed = 0;
  for (const modelFile of modelFiles) {
    if (!existsSync(modelFile)) continue;

    try {
      const source = readFileSync(modelFile, 'utf-8');
      const mixinsUsedByModel = extractMixinImports(source, modelFile, options);

      modelsProcessed++;
      if (modelsProcessed % 100 === 0 && options.verbose) {
        console.log(`📊 Analyzed ${modelsProcessed}/${modelFiles.length} models...`);
      }

    for (const mixinPath of mixinsUsedByModel) {
      modelMixins.add(mixinPath);
      if (options.verbose) {
        console.log(`📋 Model ${modelFile} uses mixin ${mixinPath}`);
      }
    }

    if (options.verbose && mixinsUsedByModel.length === 0) {
      console.log(`📋 Model ${modelFile} uses no mixins`);
    }
    } catch (error) {
      if (options.verbose) {
        console.error(`❌ Error analyzing model ${modelFile}:`, error);
      }
    }
  }

  // Analyze mixin files for their dependencies on other mixins
  for (const mixinFile of mixinFiles) {
    if (!existsSync(mixinFile)) continue;

    const source = readFileSync(mixinFile, 'utf-8');
    const mixinsUsedByMixin = extractMixinImports(source, mixinFile, options);

    mixinDependencies.set(mixinFile, new Set(mixinsUsedByMixin));

    if (options.verbose && mixinsUsedByMixin.length > 0) {
      console.log(`📋 Mixin ${mixinFile} uses mixins: ${mixinsUsedByMixin.join(', ')}`);
    }
  }

  // Transitively find all mixins that are connected to models
  const transitiveModelMixins = new Set(modelMixins);
  let changed = true;

  while (changed) {
    changed = false;
    for (const [mixinFile, dependencies] of mixinDependencies) {
      if (transitiveModelMixins.has(mixinFile)) {
        // This mixin is connected to models, so all its dependencies are too
        for (const dep of dependencies) {
          if (!transitiveModelMixins.has(dep)) {
            transitiveModelMixins.add(dep);
            changed = true;
            if (options.verbose) {
              console.log(`📋 Mixin ${dep} is transitively connected to models via ${mixinFile}`);
            }
          }
        }
      }
    }
  }

  if (options.verbose) {
    console.log(`✅ Found ${transitiveModelMixins.size} mixins connected to models (${modelMixins.size} direct, ${transitiveModelMixins.size - modelMixins.size} transitive)`);
    console.log(`📋 Model-connected mixins:`);
    for (const mixinPath of transitiveModelMixins) {
      console.log(`   - ${mixinPath}`);
    }
  }

  return transitiveModelMixins;
}

/**
 * Extract mixin import paths from a source file
 */
function extractMixinImports(source: string, filePath: string, options: TransformOptions): string[] {
  const mixinPaths: string[] = [];

  // Look for imports from mixins directories
  const mixinImportRegex = /import\s+\w+\s+from\s+['"]([^'"]*\/mixins\/[^'"]*)['"]/g;
  let match;

  while ((match = mixinImportRegex.exec(source)) !== null) {
    const importPath = match[1];
    const resolved = resolveMixinPath(importPath, filePath, options);
    if (resolved) {
      mixinPaths.push(resolved);
    }
  }

  // Also look for .extend() calls that might include mixins
  const extendRegex = /\.extend\s*\(\s*([^)]+)\)/g;
  while ((match = extendRegex.exec(source)) !== null) {
    const extendArgs = match[1];
    // Look for identifiers that might be mixins (imported from mixins)
    const identifierRegex = /\b(\w+Mixin|\w+)\b/g;
    let identifierMatch;

    while ((identifierMatch = identifierRegex.exec(extendArgs)) !== null) {
      const identifier = identifierMatch[1];
      // Check if this identifier is imported from a mixins directory
      const importRegex = new RegExp(`import\\s+${identifier}\\s+from\\s+['"]([^'"]*\/mixins\/[^'"]*)['"']`);
      const importMatch = source.match(importRegex);
      if (importMatch) {
        const resolved = resolveMixinPath(importMatch[1], filePath, options);
        if (resolved) {
          mixinPaths.push(resolved);
        }
      }
    }
  }

  return [...new Set(mixinPaths)]; // Remove duplicates
}

/**
 * Resolve a mixin import path to an absolute file path
 */
function resolveMixinPath(importPath: string, currentFilePath: string, options: TransformOptions): string | null {
  try {
    // Handle relative paths
    if (importPath.startsWith('.')) {
      const resolved = resolve(dirname(currentFilePath), importPath);
      // Add .js extension if not present
      const withExt = resolved.endsWith('.js') || resolved.endsWith('.ts') ? resolved : `${resolved}.js`;
      return existsSync(withExt) ? withExt : (existsSync(`${resolved}.ts`) ? `${resolved}.ts` : null);
    }

    // Handle absolute paths from mixins directory
    if (importPath.includes('/mixins/')) {
      // Extract the path relative to mixins directory
      const mixinsPart = importPath.substring(importPath.indexOf('/mixins/') + '/mixins/'.length);
      const fullPath = join(resolve(options.mixinSourceDir || './app/mixins'), mixinsPart);
      const withExt = fullPath.endsWith('.js') || fullPath.endsWith('.ts') ? fullPath : `${fullPath}.js`;
      return existsSync(withExt) ? withExt : (existsSync(`${fullPath}.ts`) ? `${fullPath}.ts` : null);
    }

    return null;
  } catch {
    return null;
  }
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

  console.log(`📋 Found ${modelFiles.length} model files and ${mixinFiles.length} mixin files`);

  // Analyze which mixins are actually used by models (do this early, before processing)
  let modelConnectedMixins = new Set<string>();
  if (!options.mixinsOnly) {
    try {
      console.log(`🔍 Starting mixin usage analysis...`);
      modelConnectedMixins = await analyzeModelMixinUsage(finalOptions);
      console.log(`✅ Analysis complete. Found ${modelConnectedMixins.size} connected mixins.`);
    } catch (error) {
      console.error(`❌ Error during mixin usage analysis:`, error);
      console.log(`⚠️  Falling back to processing all mixins`);
    }
  }

  // Pass the model-connected mixins to the transform options
  const enhancedOptions = {
    ...finalOptions,
    modelConnectedMixins
  };

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Process model files individually using the model transform
  for (const filePath of modelFiles) {
    try {
      if (finalOptions.verbose) {
        console.log(`🔄 Processing: ${filePath}`);
      }

      const source = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
      if (!source) {
        console.error(`❌ Could not read file: ${filePath}`);
        errors++;
        continue;
      }

      // Apply the model transform
      const transformed = modelTransform(filePath, source, enhancedOptions);

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
            mkdirSync(outputDirPath, { recursive: true });
          }

          writeFileSync(outputPath, transformed, 'utf-8');
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


      const source = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
      if (!source) {
        console.error(`❌ Could not read file: ${filePath}`);
        errors++;
        continue;
      }


      // Apply the mixin transform
      const transformed = mixinTransform(filePath, source, enhancedOptions);

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
            mkdirSync(outputDirPath, { recursive: true });
          }

          writeFileSync(outputPath, transformed, 'utf-8');
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
