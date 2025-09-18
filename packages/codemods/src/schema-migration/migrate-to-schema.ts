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
 * Placeholder jscodeshift function - not used since migrate-to-schema runs as batch operation
 * This is only exported for CLI compatibility
 */
export default function (): undefined {
  return undefined;
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

  // Look for all import statements and resolve them to see if they point to mixins
  const importRegex = /import\s+\w+\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(source)) !== null) {
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
      // Check if this identifier is imported and resolve to see if it's a mixin
      const importRegex = new RegExp(`import\\s+${identifier}\\s+from\\s+['"]([^'"]+)['"']`);
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
    let resolvedPath: string;

    // Handle relative paths
    if (importPath.startsWith('.')) {
      resolvedPath = resolve(dirname(currentFilePath), importPath);
    } else {
      // Handle absolute/module paths - try to resolve them relative to current file
      resolvedPath = resolve(dirname(currentFilePath), importPath);
    }

    // Try different extensions
    const possiblePaths = [
      resolvedPath,
      `${resolvedPath}.js`,
      `${resolvedPath}.ts`,
    ];

    const mixinSourceDir = resolve(options.mixinSourceDir || './app/mixins');

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        // Check if this resolved path is within the mixins source directory
        if (path.startsWith(mixinSourceDir)) {
          return path;
        }
        break;
      }
    }

    return null;
  } catch (error) {
    if (options.verbose) {
      console.log(`📋 DEBUG: Error resolving path '${importPath}':`, error);
    }
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

  // Ensure output directories exist (specific directories are created as needed)
  if (!finalOptions.dryRun) {
    // Only create specific directories if they are configured
    // The generic outputDir is only used for fallback artifacts and shouldn't be pre-created
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

      // Apply the model transform to get artifacts
      const { toArtifacts } = await import('./model-to-schema.js');
      const artifacts = toArtifacts(filePath, source, enhancedOptions);

      if (artifacts.length > 0) {
        processed++;

        // Write each artifact to the appropriate directory
        for (const artifact of artifacts) {
          let outputDir: string;
          let outputPath: string;

          if (artifact.type === 'schema') {
            // Schema files go to resourcesDir
            outputDir = finalOptions.resourcesDir || './app/data/resources';
            const relativePath = filePath.replace(resolve(finalOptions.modelSourceDir || './app/models'), '');
            const outputName = relativePath.replace(/\.(js|ts)$/, '.js'); // Schemas are always .js
            outputPath = join(resolve(outputDir), outputName);
          } else if (artifact.type === 'resource-type') {
            // Type files are colocated with their schemas in resourcesDir
            outputDir = finalOptions.resourcesDir || './app/data/resources';
            const relativePath = filePath.replace(resolve(finalOptions.modelSourceDir || './app/models'), '');
            outputPath = join(resolve(outputDir), relativePath.replace(/\.(js|ts)$/, '.schema.types.ts'));
          } else if (artifact.type === 'extension' || artifact.type === 'extension-type') {
            // Extension files go to extensionsDir
            outputDir = finalOptions.extensionsDir || './app/data/extensions';
            const relativePath = filePath.replace(resolve(finalOptions.modelSourceDir || './app/models'), '');
            const outputName = artifact.type === 'extension'
              ? relativePath.replace(/\.(js|ts)$/, '.js')
              : relativePath.replace(/\.(js|ts)$/, '.schema.types.ts');
            outputPath = join(resolve(outputDir), outputName);
          } else {
            // Default fallback
            outputDir = finalOptions.outputDir || './app/schemas';
            outputPath = join(resolve(outputDir), artifact.suggestedFileName);
          }

          if (!finalOptions.dryRun) {
            // Ensure output directory exists
            const outputDirPath = dirname(outputPath);
            if (!existsSync(outputDirPath)) {
              mkdirSync(outputDirPath, { recursive: true });
            }

            writeFileSync(outputPath, artifact.code, 'utf-8');
            if (finalOptions.verbose) {
              console.log(`✅ Generated ${artifact.type}: ${outputPath}`);
            }
          } else if (finalOptions.verbose) {
            console.log(`✅ Would generate ${artifact.type}: ${outputPath} (dry run)`);
          }
        }
      } else {
        skipped++;
        if (finalOptions.verbose) {
          console.log(`⏭️  Skipped (no artifacts generated): ${filePath}`);
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


      // Apply the mixin transform to get artifacts
      const { toArtifacts } = await import('./mixin-to-schema.js');
      const artifacts = toArtifacts(filePath, source, enhancedOptions);

      if (artifacts.length > 0) {
        processed++;

        // Write each artifact to the appropriate directory
        for (const artifact of artifacts) {
          let outputDir: string;
          let outputPath: string;

          if (artifact.type === 'trait') {
            // Trait files go to traitsDir
            outputDir = finalOptions.traitsDir || './app/data/traits';
            const relativePath = filePath.replace(resolve(finalOptions.mixinSourceDir || './app/mixins'), '');
            const outputName = relativePath.replace(/\.(js|ts)$/, '.js'); // Traits are always .js
            outputPath = join(resolve(outputDir), outputName);
          } else if (artifact.type === 'trait-type') {
            // Type files are colocated with their traits in traitsDir
            outputDir = finalOptions.traitsDir || './app/data/traits';
            const relativePath = filePath.replace(resolve(finalOptions.mixinSourceDir || './app/mixins'), '');
            outputPath = join(resolve(outputDir), relativePath.replace(/\.(js|ts)$/, '.schema.types.ts'));
          } else if (artifact.type === 'extension' || artifact.type === 'extension-type') {
            // Extension files go to extensionsDir
            outputDir = finalOptions.extensionsDir || './app/data/extensions';
            const relativePath = filePath.replace(resolve(finalOptions.mixinSourceDir || './app/mixins'), '');
            const outputName = artifact.type === 'extension'
              ? relativePath.replace(/\.(js|ts)$/, '.js')
              : relativePath.replace(/\.(js|ts)$/, '.schema.types.ts');
            outputPath = join(resolve(outputDir), outputName);
          } else {
            // Default fallback
            outputDir = finalOptions.outputDir || './app/schemas';
            outputPath = join(resolve(outputDir), artifact.suggestedFileName);
          }

          if (!finalOptions.dryRun) {
            // Ensure output directory exists
            const outputDirPath = dirname(outputPath);
            if (!existsSync(outputDirPath)) {
              mkdirSync(outputDirPath, { recursive: true });
            }

            writeFileSync(outputPath, artifact.code, 'utf-8');
            if (finalOptions.verbose) {
              console.log(`✅ Generated ${artifact.type}: ${outputPath}`);
            }
          } else if (finalOptions.verbose) {
            console.log(`✅ Would generate ${artifact.type}: ${outputPath} (dry run)`);
          }
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
