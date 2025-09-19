import { parse } from '@ast-grep/napi';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { basename,dirname, join, resolve } from 'path';

import { processIntermediateModelsToTraits } from './model-to-schema.js';
import type { TransformOptions } from './utils/ast-utils.js';
import {
  debugLog,
  DEFAULT_MIXIN_SOURCE,
  findEmberImportLocalName,
  getLanguageFromPath,
  isModelFile as astIsModelFile
} from './utils/ast-utils.js';
import { Logger } from './utils/logger.js';

export interface MigrateOptions extends Partial<TransformOptions> {
  mixinsOnly?: boolean;
  modelsOnly?: boolean;
  skipProcessed?: boolean;
  inputDir?: string;
  modelSourceDir?: string;
  mixinSourceDir?: string;
}

/**
 * JSCodeshift transform function that throws an error
 * migrate-to-schema is designed to run as a batch operation only
 */
export default function (): never {
  throw new Error(
    'migrate-to-schema should be run as a batch operation, not on individual files. Use the CLI command directly.'
  );
}

/**
 * Validate that a file can be parsed as valid JavaScript/TypeScript
 */
function validateFileAST(filePath: string, source: string, options?: TransformOptions): { valid: boolean; error?: string } {
  try {
    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    ast.root(); // Try to access the root to ensure parsing succeeded
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check if a file is a mixin file using AST analysis
 */
function astIsMixinFile(filePath: string, source: string, options?: TransformOptions): boolean {
  try {
    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    const root = ast.root();

    // Look for Mixin imports from @ember/object/mixin
    const mixinSources = [DEFAULT_MIXIN_SOURCE];
    const mixinImportLocal = findEmberImportLocalName(root, mixinSources, options, filePath, process.cwd());

    return !!mixinImportLocal;
  } catch (error) {
    debugLog(options, `Error checking if file is mixin: ${String(error)}`);
    return false;
  }
}

/**
 * Analyze which mixins are actually used by models (directly or transitively)
 */
function analyzeModelMixinUsage(
  modelFiles: string[],
  mixinFiles: string[],
  fileSourceCache: Map<string, string>,
  options: TransformOptions
): Set<string> {
  const modelMixins = new Set<string>();
  const mixinDependencies = new Map<string, Set<string>>();

  const logger = new Logger(options.verbose);
  if (options.verbose) {
    logger.info(`🔍 Analyzing mixin usage relationships...`);
    logger.info(`📊 Found ${modelFiles.length} models and ${mixinFiles.length} mixins`);
  }

  // Analyze model files for direct mixin usage
  let modelsProcessed = 0;
  for (const modelFile of modelFiles) {
    try {
      const source = fileSourceCache.get(modelFile);
      if (!source) continue;

      const mixinsUsedByModel = extractMixinImports(source, modelFile, options);

      modelsProcessed++;
      if (modelsProcessed % 100 === 0 && options.verbose) {
        logger.info(`📊 Analyzed ${modelsProcessed}/${modelFiles.length} models...`);
      }

      for (const mixinPath of mixinsUsedByModel) {
        modelMixins.add(mixinPath);
        if (options.verbose) {
          logger.info(`📋 Model ${modelFile} uses mixin ${mixinPath}`);
        }
      }

      if (options.verbose && mixinsUsedByModel.length === 0) {
        logger.info(`📋 Model ${modelFile} uses no mixins`);
      }
    } catch (error) {
      if (options.verbose) {
        logger.error(`❌ Error analyzing model ${modelFile}: ${String(error)}`);
      }
    }
  }

  // Analyze mixin files for their dependencies on other mixins
  for (const mixinFile of mixinFiles) {
    try {
      const source = fileSourceCache.get(mixinFile);
      if (!source) continue;

      const mixinsUsedByMixin = extractMixinImports(source, mixinFile, options);
      mixinDependencies.set(mixinFile, new Set(mixinsUsedByMixin));

      if (options.verbose && mixinsUsedByMixin.length > 0) {
        logger.info(`📋 Mixin ${mixinFile} uses mixins: ${mixinsUsedByMixin.join(', ')}`);
      }
    } catch (error) {
      if (options.verbose) {
        logger.error(`❌ Error analyzing mixin ${mixinFile}: ${String(error)}`);
      }
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
              logger.info(`📋 Mixin ${dep} is transitively connected to models via ${mixinFile}`);
            }
          }
        }
      }
    }
  }

  if (options.verbose) {
    logger.info(`✅ Found ${transitiveModelMixins.size} mixins connected to models (${modelMixins.size} direct, ${transitiveModelMixins.size - modelMixins.size} transitive)`);
    logger.info(`📋 Model-connected mixins:`);
    for (const mixinPath of transitiveModelMixins) {
      logger.info(`   - ${mixinPath}`);
    }
  }

  return transitiveModelMixins;
}

/**
 * Get the relative path for a mixin file, handling both local and external mixins
 */
function getRelativePathForMixin(filePath: string, options: TransformOptions): string {
  // First, try to get relative path from the main mixin source directory
  const mixinSourceDir = resolve(options.mixinSourceDir || './app/mixins');
  if (filePath.startsWith(mixinSourceDir)) {
    return filePath.replace(mixinSourceDir, '').replace(/^\//, '');
  }

  // Check if this is an external mixin from additionalMixinSources
  if (options.additionalMixinSources) {
    for (const source of options.additionalMixinSources) {
      // Get the base directory (remove trailing /* if present)
      let baseDir = source.dir;
      if (baseDir.endsWith('/*')) {
        baseDir = baseDir.slice(0, -2);
      } else if (baseDir.endsWith('*')) {
        baseDir = baseDir.slice(0, -1);
      }

      const resolvedBaseDir = resolve(baseDir);
      if (filePath.startsWith(resolvedBaseDir)) {
        // For external mixins, use just the filename
        return basename(filePath);
      }
    }
  }

  // Fallback: use just the filename
  return basename(filePath);
}

/**
 * Extract mixin import paths from a source file using AST analysis
 */
function extractMixinImports(source: string, filePath: string, options: TransformOptions): string[] {
  const mixinPaths: string[] = [];

  try {
    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    const root = ast.root();

    // Create a map of import identifiers to their source paths
    const importMap = new Map<string, string>();

    // Find all import statements
    const importStatements = root.findAll({ rule: { kind: 'import_statement' } });
    debugLog(options, `[DEBUG] extractMixinImports for ${filePath}: found ${importStatements.length} import statements`);

    for (const importStatement of importStatements) {
      const sourceNode = importStatement.find({ rule: { kind: 'string' } });
      if (!sourceNode) {
        debugLog(options, `[DEBUG] Import statement has no string literal: ${importStatement.text()}`);
        continue;
      }

      const importPath = sourceNode.text().replace(/['"]/g, '');
      debugLog(options, `[DEBUG] Processing import: ${importPath}`);

      // Find the imported identifier(s)
      const importClause = importStatement.find({ rule: { kind: 'import_clause' } });
      if (!importClause) {
        debugLog(options, `[DEBUG] Import has no clause: ${importStatement.text()}`);
        continue;
      }

      // Handle default imports (import Foo from 'path')
      const identifier = importClause.find({ rule: { kind: 'identifier' } });
      if (identifier) {
        const identifierName = identifier.text();
        debugLog(options, `[DEBUG] Found default import: ${identifierName} from ${importPath}`);
        importMap.set(identifierName, importPath);
        continue;
      }

      // Handle named imports (import { Foo, Bar } from 'path')
      const namedImports = importClause.find({ rule: { kind: 'named_imports' } });
      if (namedImports) {
        const specifiers = namedImports.findAll({ rule: { kind: 'import_specifier' } });
        debugLog(options, `[DEBUG] Found ${specifiers.length} named imports from ${importPath}`);
        for (const specifier of specifiers) {
          const name = specifier.find({ rule: { kind: 'identifier' } });
          if (name) {
            const identifierName = name.text();
            debugLog(options, `[DEBUG] Named import: ${identifierName} from ${importPath}`);
            importMap.set(identifierName, importPath);
          }
        }
      }
    }

    debugLog(options, `[DEBUG] Built import map with ${importMap.size} entries:`);
    for (const [identifier, importPath] of importMap) {
      debugLog(options, `[DEBUG]   ${identifier} -> ${importPath}`);
    }

    // Check all imports to see if they resolve to mixin files
    for (const [, importPath] of importMap) {
      const resolved = resolveMixinPath(importPath, filePath, options);
      debugLog(options, `[DEBUG] resolveMixinPath(${importPath}): ${resolved || 'null'}`);
      if (resolved) {
        mixinPaths.push(resolved);
      }
    }

    // Look for .extend() calls and check if they use any imported mixins
    const extendCalls = root.findAll({
      rule: {
        kind: 'call_expression',
        has: {
          kind: 'member_expression',
          has: {
            field: 'property',
            kind: 'property_identifier',
            regex: 'extend'
          }
        }
      }
    });

    debugLog(options, `[DEBUG] Found ${extendCalls.length} extend calls`);

    for (const extendCall of extendCalls) {
      debugLog(options, `[DEBUG] Extend call: ${extendCall.text()}`);
      const args = extendCall.find({ rule: { kind: 'arguments' } });
      if (!args) {
        debugLog(options, `[DEBUG] Extend call has no arguments`);
        continue;
      }

      // Find identifiers in the extend arguments
      const identifiers = args.findAll({ rule: { kind: 'identifier' } });
      debugLog(options, `[DEBUG] Found ${identifiers.length} identifiers in extend args`);

      for (const identifier of identifiers) {
        const identifierName = identifier.text();
        debugLog(options, `[DEBUG] Checking identifier: ${identifierName}`);
        const importPath = importMap.get(identifierName);

        if (importPath) {
          debugLog(options, `[DEBUG] Identifier ${identifierName} maps to import ${importPath}`);
          const resolved = resolveMixinPath(importPath, filePath, options);
          debugLog(options, `[DEBUG] resolveMixinPath result: ${resolved || 'null'}`);
          if (resolved) {
            mixinPaths.push(resolved);
          }
        } else {
          debugLog(options, `[DEBUG] Identifier ${identifierName} not found in import map`);
        }
      }
    }

    const finalPaths = [...new Set(mixinPaths)];
    debugLog(options, `[DEBUG] Final mixin paths: [${finalPaths.join(', ')}]`);
    return finalPaths; // Remove duplicates
  } catch (error) {
    debugLog(options, `Error extracting mixin imports from ${filePath}: ${String(error)}`);
    return [];
  }
}

/**
 * Resolve a mixin import path to an absolute file path
 */
function resolveMixinPath(importPath: string, currentFilePath: string, options: TransformOptions): string | null {
  try {
    // Handle relative paths
    if (importPath.startsWith('.')) {
      const resolvedPath = resolve(dirname(currentFilePath), importPath);
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
    }

    // Handle external/package imports using additionalMixinSources
    if (options.additionalMixinSources) {
      if (options.verbose) {
        debugLog(options, `📋 Trying to resolve external import '${importPath}' using ${options.additionalMixinSources.length} additional sources`);
      }

      for (const source of options.additionalMixinSources) {
        // Convert glob pattern to regex
        const patternRegex = new RegExp(
          '^' + source.pattern.replace(/\*/g, '(.*)') + '$'
        );

        if (options.verbose) {
          debugLog(options, `📋 Testing pattern '${source.pattern}' (regex: ${patternRegex}) against import '${importPath}'`);
        }

        const match = importPath.match(patternRegex);
        if (match) {
          // Replace the matched wildcards in the directory path
          let targetDir = source.dir;
          for (let i = 1; i < match.length; i++) {
            targetDir = targetDir.replace('*', match[i]);
          }

          // Try different extensions
          const possiblePaths = [
            targetDir,
            `${targetDir}.js`,
            `${targetDir}.ts`,
          ];

          if (options.verbose) {
            debugLog(options, `📋 Trying to resolve external mixin '${importPath}' to '${targetDir}'`);
          }

          for (const path of possiblePaths) {
            if (existsSync(path)) {
              if (options.verbose) {
                debugLog(options, `📋 Successfully resolved '${importPath}' to '${path}'`);
              }
              return path;
            }
          }
        }
      }
    }

    // If not found in external sources, try to resolve in local mixins directory
    const mixinSourceDir = resolve(options.mixinSourceDir || './app/mixins');

    // For local module imports like 'soxhub-client/mixins/foo', extract just the last part
    const localMixinPath = importPath.includes('/mixins/')
      ? importPath.split('/mixins/')[1]
      : importPath;

    const localResolvedPath = resolve(mixinSourceDir, localMixinPath);
    const possiblePaths = [
      localResolvedPath,
      `${localResolvedPath}.js`,
      `${localResolvedPath}.ts`,
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        if (options.verbose) {
          debugLog(options, `📋 Successfully resolved local mixin '${importPath}' to '${path}'`);
        }
        return path;
      }
    }

    if (options.verbose) {
      debugLog(options, `📋 Could not resolve mixin path '${importPath}'`);
    }

    return null;
  } catch (error) {
    if (options.verbose) {
      debugLog(options, `📋 DEBUG: Error resolving path '${importPath}': ${String(error)}`);
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

  const logger = new Logger(finalOptions.verbose);
  logger.info(`🚀 Starting schema migration...`);
  logger.info(`📁 Input directory: ${resolve(finalOptions.inputDir || './app')}`);
  logger.info(`📁 Output directory: ${resolve(finalOptions.outputDir || './app/schemas')}`);

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
      logger.info(`📋 Found ${modelFiles.length} model files`);
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

    // Also discover files from additionalMixinSources
    if (finalOptions.additionalMixinSources) {
      for (const source of finalOptions.additionalMixinSources) {
        // Convert dir pattern to glob pattern (e.g., "path/to/mixins/*" -> "path/to/mixins/**/*.{js,ts}")
        let dirGlobPattern = source.dir;
        if (dirGlobPattern.endsWith('*')) {
          // Replace trailing * with **/*.{js,ts}
          dirGlobPattern = dirGlobPattern.replace(/\*$/, '**/*.{js,ts}');
        } else {
          // Add **/*.{js,ts} if no glob pattern
          dirGlobPattern = join(dirGlobPattern, '**/*.{js,ts}');
        }

        try {
          const additionalMixinFiles = await glob(dirGlobPattern);
          filesToProcess.push(
            ...additionalMixinFiles.filter(
              (file) => existsSync(file) && (!options.skipProcessed || !isAlreadyProcessed(file, finalOptions))
            )
          );

          if (finalOptions.verbose) {
            logger.info(`📋 Found ${additionalMixinFiles.length} additional mixin files from ${source.dir}`);
          }
        } catch (error) {
          if (finalOptions.verbose) {
            logger.warn(`⚠️ Error discovering mixins from ${source.dir}: ${String(error)}`);
          }
        }
      }
    }

    if (finalOptions.verbose) {
      logger.info(`📋 Found ${mixinFiles.length} mixin files`);
    }
  }

  if (filesToProcess.length === 0) {
    logger.info('✅ No files found to process.');
    return;
  }

  logger.info(`📋 Processing ${filesToProcess.length} files total`);

  // Separate model and mixin files using AST analysis
  const modelFiles: string[] = [];
  const mixinFiles: string[] = [];

  // Cache file contents and categorize files using AST analysis
  const fileSourceCache = new Map<string, string>();

  for (const file of filesToProcess) {
    try {
      const source = readFileSync(file, 'utf-8');
      fileSourceCache.set(file, source);

      // Validate file can be parsed before attempting analysis
      const validation = validateFileAST(file, source, finalOptions);
      if (!validation.valid) {
        if (finalOptions.verbose) {
          logger.warn(`⚠️  Skipping ${file}: Invalid syntax - ${validation.error}`);
        }
        continue;
      }

      // Use AST to determine file type, with directory hints as optimization
      const isLikelyModel = file.includes('/models/');
      const isLikelyMixin = file.includes('/mixins/');

      if (finalOptions.verbose) {
        logger.debug(`🔍 Analyzing file: ${file} (likely model: ${isLikelyModel}, likely mixin: ${isLikelyMixin})`);
      }

      // Check model first if it's in models directory, otherwise check both
      if (isLikelyModel) {
        const isModel = isModelFile(file, source);
        if (finalOptions.verbose) {
          logger.debug(`📋 AST analysis result for ${file}: isModel=${isModel}`);
        }
        if (isModel) {
          modelFiles.push(file);
        }
      } else if (isLikelyMixin) {
        const isMixin = isMixinFile(file, source, finalOptions);
        if (finalOptions.verbose) {
          logger.debug(`📋 AST analysis result for ${file}: isMixin=${isMixin}`);
        }
        if (isMixin) {
          mixinFiles.push(file);
        }
      } else {
        // File is not in expected directory, check both types
        const isModel = isModelFile(file, source);
        const isMixin = isMixinFile(file, source, finalOptions);
        if (finalOptions.verbose) {
          logger.debug(`📋 AST analysis result for ${file}: isModel=${isModel}, isMixin=${isMixin}`);
        }
        if (isModel) {
          modelFiles.push(file);
        } else if (isMixin) {
          mixinFiles.push(file);
        }
      }
    } catch (error) {
      if (finalOptions.verbose) {
        logger.error(`⚠️  Could not read or parse ${file}: ${String(error)}`);
      }
    }
  }

  logger.info(`📋 Found ${modelFiles.length} model files and ${mixinFiles.length} mixin files`);

  // Analyze which mixins are actually used by models (do this early, before processing)
  let modelConnectedMixins = new Set<string>();
  if (!options.mixinsOnly) {
    try {
      logger.info(`🔍 Starting mixin usage analysis...`);
      modelConnectedMixins = analyzeModelMixinUsage(modelFiles, mixinFiles, fileSourceCache, finalOptions);
      logger.info(`✅ Analysis complete. Found ${modelConnectedMixins.size} connected mixins.`);
    } catch (error) {
      logger.error(`❌ Error during mixin usage analysis: ${String(error)}`);
      logger.warn(`⚠️  Falling back to processing all mixins`);
    }
  }

  // Process intermediate models to generate trait artifacts first
  // This must be done before processing regular models that extend these intermediate models
  if (finalOptions.intermediateModelPaths && finalOptions.intermediateModelPaths.length > 0) {
    try {
      logger.info(`🔄 Processing ${finalOptions.intermediateModelPaths.length} intermediate models...`);
      const intermediateResults = processIntermediateModelsToTraits(
        Array.isArray(finalOptions.intermediateModelPaths)
          ? finalOptions.intermediateModelPaths
          : [finalOptions.intermediateModelPaths],
        finalOptions.additionalModelSources,
        finalOptions.additionalMixinSources,
        finalOptions
      );

      // Write intermediate model trait artifacts
      for (const artifact of intermediateResults.artifacts) {
        let outputDir: string;
        let outputPath: string;

        if (artifact.type === 'trait') {
          // Trait files go to traitsDir
          outputDir = finalOptions.traitsDir ?? './app/data/traits';
          outputPath = join(resolve(outputDir), artifact.suggestedFileName);
        } else if (artifact.type === 'trait-type') {
          // Type files are colocated with their traits in traitsDir
          outputDir = finalOptions.traitsDir ?? './app/data/traits';
          // Generate type file name from the trait artifact name
          const typeFileName = artifact.suggestedFileName.replace(/\.js$/, '.schema.types.ts');
          outputPath = join(resolve(outputDir), typeFileName);
        } else {
          // Default fallback
          outputDir = finalOptions.outputDir ?? './app/schemas';
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
            logger.info(`✅ Generated intermediate ${artifact.type}: ${outputPath}`);
          }
        } else if (finalOptions.verbose) {
          logger.info(`✅ Would generate intermediate ${artifact.type}: ${outputPath} (dry run)`);
        }
      }

      if (intermediateResults.errors.length > 0) {
        logger.error(`⚠️ Errors processing intermediate models:`);
        for (const error of intermediateResults.errors) {
          logger.error(`   ${String(error)}`);
        }
      }

      logger.info(`✅ Processed ${intermediateResults.artifacts.length} intermediate model artifacts`);
    } catch (error) {
      logger.error(`❌ Error processing intermediate models: ${String(error)}`);
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
        logger.debug(`🔄 Processing: ${filePath}`);
      }

      // Use cached source instead of re-reading
      const source = fileSourceCache.get(filePath);
      if (!source) {
        logger.error(`❌ Could not get cached source for file: ${filePath}`);
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
            // Resources should include .schema and match original source file extension
            const extension = filePath.endsWith('.ts') ? '.ts' : '.js';
            const outputName = relativePath.replace(/\.(js|ts)$/, `.schema${extension}`);
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
              ? (() => {
                  // Extensions should include .schema and match original source file extension
                  const extension = filePath.endsWith('.ts') ? '.ts' : '.js';
                  return relativePath.replace(/\.(js|ts)$/, `.schema${extension}`);
                })()
              : relativePath.replace(/\.(js|ts)$/, '.schema.types.ts');
            outputPath = join(resolve(outputDir), outputName);
          } else {
            // Default fallback
            outputDir = finalOptions.outputDir ?? './app/schemas';
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
              logger.info(`✅ Generated ${artifact.type}: ${outputPath}`);
            }
          } else if (finalOptions.verbose) {
            logger.info(`✅ Would generate ${artifact.type}: ${outputPath} (dry run)`);
          }
        }
      } else {
        skipped++;
        if (finalOptions.verbose) {
          logger.debug(`⏭️  Skipped (no artifacts generated): ${filePath}`);
        }
      }
    } catch (error) {
      errors++;
      logger.error(`❌ Error processing ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  // Process mixin files (only model mixins will be transformed)
  for (const filePath of mixinFiles) {
    try {
      if (finalOptions.verbose) {
        logger.debug(`🔄 Processing: ${filePath}`);
      }

      // Use cached source instead of re-reading
      const source = fileSourceCache.get(filePath);
      if (!source) {
        logger.error(`❌ Could not get cached source for file: ${filePath}`);
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
            outputDir = finalOptions.traitsDir ?? './app/data/traits';
            const relativePath = getRelativePathForMixin(filePath, finalOptions);
            // Traits should include .schema and match original source file extension
            const extension = filePath.endsWith('.ts') ? '.ts' : '.js';
            const outputName = relativePath.replace(/\.(js|ts)$/, `.schema${extension}`);
            outputPath = join(resolve(outputDir), outputName);
          } else if (artifact.type === 'trait-type') {
            // Type files are colocated with their traits in traitsDir
            outputDir = finalOptions.traitsDir ?? './app/data/traits';
            const relativePath = getRelativePathForMixin(filePath, finalOptions);
            outputPath = join(resolve(outputDir), relativePath.replace(/\.(js|ts)$/, '.schema.types.ts'));
          } else if (artifact.type === 'extension' || artifact.type === 'extension-type') {
            // Extension files go to extensionsDir
            outputDir = finalOptions.extensionsDir || './app/data/extensions';
            const relativePath = filePath.replace(resolve(finalOptions.mixinSourceDir || './app/mixins'), '');
            const outputName = artifact.type === 'extension'
              ? (() => {
                  // Extensions should include .schema and match original source file extension
                  const extension = filePath.endsWith('.ts') ? '.ts' : '.js';
                  return relativePath.replace(/\.(js|ts)$/, `.schema${extension}`);
                })()
              : relativePath.replace(/\.(js|ts)$/, '.schema.types.ts');
            outputPath = join(resolve(outputDir), outputName);
          } else {
            // Default fallback
            outputDir = finalOptions.outputDir ?? './app/schemas';
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
              logger.info(`✅ Generated ${artifact.type}: ${outputPath}`);
            }
          } else if (finalOptions.verbose) {
            logger.info(`✅ Would generate ${artifact.type}: ${outputPath} (dry run)`);
          }
        }
      } else {
        skipped++;
        if (finalOptions.verbose) {
          logger.debug(`⏭️  Skipped (not a model mixin): ${filePath}`);
        }
      }
    } catch (error) {
      errors++;
      logger.error(`❌ Error processing ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  logger.info(`\n✅ Migration complete!`);
  logger.info(`   📊 Processed: ${processed} files`);
  logger.info(`   ⏭️  Skipped: ${skipped} files (not applicable for transformation)`);
  if (errors > 0) {
    logger.info(`   ❌ Errors: ${errors} files`);
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
 * Determine if a file is a model file using AST analysis
 */
function isModelFile(filePath: string, source?: string): boolean {
  try {
    const fileSource = source || readFileSync(filePath, 'utf-8');
    return astIsModelFile(filePath, fileSource);
  } catch {
    return false;
  }
}

/**
 * Determine if a file is a mixin file using AST analysis
 */
function isMixinFile(filePath: string, source?: string, options?: TransformOptions): boolean {
  try {
    const fileSource = source || readFileSync(filePath, 'utf-8');
    return astIsMixinFile(filePath, fileSource, options);
  } catch {
    return false;
  }
}
