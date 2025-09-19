import type { SgNode } from '@ast-grep/napi';
import { parse } from '@ast-grep/napi';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import type { SchemaField, TransformArtifact, TransformOptions } from './utils/ast-utils.js';

/**
 * Determines if an AST node represents object method syntax that doesn't need key: value format
 * This is used for class methods that become extension object methods
 */
function isClassMethodSyntax(methodNode: SgNode): boolean {
  const methodKind = methodNode.kind();

  // Method definitions are always object methods in extensions
  if (methodKind === 'method_definition') {
    return true;
  }

  // Field definitions that are functions/arrow functions
  if (methodKind === 'field_definition') {
    const value = methodNode.field('value');
    if (value) {
      const valueKind = value.kind();
      if (valueKind === 'arrow_function' || valueKind === 'function') {
        return false; // These need key: value syntax in extensions
      }
    }
  }

  return false;
}
import {
  buildLegacySchemaObject,
  convertToSchemaFieldWithNodes,
  createExtensionFromOriginalFile,
  createTypeArtifact,
  debugLog,
  DEFAULT_EMBER_DATA_SOURCE,
  detectQuoteStyle,
  errorLog,
  extractBaseName,
  extractPascalCaseName,
  extractTypeFromDeclaration,
  extractTypeFromDecoratorWithNodes,
  extractTypeFromMethod,
  findDefaultExport,
  findEmberImportLocalName,
  generateCommonWarpDriveImports,
  generateExportStatement,
  generateTraitSchemaCode,
  getEmberDataImports,
  getExportedIdentifier,
  getFileExtension,
  getLanguageFromPath,
  getMixinImports,
  getTypeScriptTypeForAttribute,
  getTypeScriptTypeForBelongsTo,
  getTypeScriptTypeForHasMany,
  mixinNameToTraitName,
  parseDecoratorArgumentsWithNodes,
  toPascalCase,
  transformModelToResourceImport,
  withTransformWrapper,
} from './utils/ast-utils.js';

/**
 * Shared result type for model analysis
 */
interface ModelAnalysisResult {
  isValid: boolean;
  modelImportLocal?: string;
  defaultExportNode?: SgNode;
  schemaFields: SchemaField[];
  extensionProperties: Array<{ name: string; originalKey: string; value: string; typeInfo?: ExtractedType; isObjectMethod?: boolean }>;
  mixinTraits: string[];
  mixinExtensions: string[];
  modelName: string;
  baseName: string;
}

/**
 * Type information extracted from AST
 */
interface ExtractedType {
  type: string;
  readonly?: boolean;
  optional?: boolean;
  imports?: string[];
}

/**
 * Shared function to analyze a model file and extract all necessary information
 */
function analyzeModelFile(filePath: string, source: string, options: TransformOptions): ModelAnalysisResult {
  const lang = getLanguageFromPath(filePath);
  const modelName = extractPascalCaseName(filePath);
  const baseName = extractBaseName(filePath);
  const fileExtension = getFileExtension(filePath);

  const invalidResult: ModelAnalysisResult = {
    isValid: false,
    modelImportLocal: undefined,
    defaultExportNode: undefined,
    schemaFields: [],
    extensionProperties: [],
    mixinTraits: [],
    mixinExtensions: [],
    modelName,
    baseName,
  };

  try {
    const ast = parse(lang, source);
    const root = ast.root();

    // Verify this is an ember model file we should consider
    const expectedSources = [options?.emberDataImportSource || DEFAULT_EMBER_DATA_SOURCE];
    const modelImportLocal = findEmberImportLocalName(root, expectedSources, options, filePath, process.cwd());
    debugLog(options, `DEBUG: Model import local: ${modelImportLocal}`);

    // Validate there is a default export extending the model
    const defaultExportNode = findDefaultExport(root, options);
    debugLog(options, `DEBUG: Default export node: ${defaultExportNode ? 'found' : 'not found'}`);
    if (!defaultExportNode) {
      return invalidResult;
    }

    // Check if this is a valid model class (either with EmberData decorators or extending intermediate models)
    const isValidModel = isModelClass(defaultExportNode, modelImportLocal, undefined, root, options);
    debugLog(options, `DEBUG: Is valid model: ${isValidModel}`);
    if (!isValidModel) {
      debugLog(options, 'DEBUG: Not a valid model class, skipping');
      return invalidResult;
    }

    // If no EmberData decorator imports found, check if it extends from intermediate models
    if (!modelImportLocal) {
      debugLog(options, 'DEBUG: No EmberData decorator imports found, checking for intermediate model extension');
      // We'll continue processing even without decorator imports if it's a valid model class
    }

    // Get the valid EmberData decorator imports for this file
    const emberDataImports = getEmberDataImports(root, expectedSources, options);

    // Extract schema fields and extension properties from the class body
    const { schemaFields, extensionProperties, mixinTraits, mixinExtensions } = extractModelFields(
      root,
      emberDataImports,
      filePath,
      options
    );

    // For simple model files that just extend from a base model without decorators,
    // we should still generate a basic schema even if there are no fields
    if (schemaFields.length === 0 && extensionProperties.length === 0 && mixinTraits.length === 0) {
      debugLog(
        options,
        'DEBUG: No schema fields, extension properties, or mixin traits found, but continuing for simple model files'
      );
      // Don't return invalidResult here - let the processing continue
    }

    debugLog(
      options,
      `DEBUG: Returning from analyzeModelFile with defaultExportNode: ${defaultExportNode ? 'defined' : 'undefined'}`
    );
    return {
      isValid: true,
      modelImportLocal,
      defaultExportNode,
      schemaFields,
      extensionProperties,
      mixinTraits,
      mixinExtensions,
      modelName,
      baseName,
    };
  } catch (error) {
    debugLog(options, `DEBUG: Error analyzing model file: ${String(error)}`);
    return invalidResult;
  }
}

/**
 * Transform to convert EmberData models to WarpDrive LegacyResourceSchema patterns
 */
export default function transform(filePath: string, source: string, options: TransformOptions): string {
  return withTransformWrapper(
    filePath,
    source,
    options,
    'model-to-schema',
    (_root, sourceContent, filePathParam, optionsParam) => {
      const analysis = analyzeModelFile(filePathParam, sourceContent, optionsParam);

      if (!analysis.isValid) {
        debugLog(optionsParam, 'Model analysis failed, skipping transform');
        return sourceContent;
      }

      const {
        defaultExportNode,
        schemaFields,
        extensionProperties,
        mixinTraits,
        mixinExtensions,
        modelName,
        baseName,
      } = analysis;

      debugLog(
        optionsParam,
        `Found ${schemaFields.length} schema fields and ${extensionProperties.length} extension properties`
      );

      // Transform relative model imports to schema type imports first
      const transformedSource = transformModelImportsInSource(sourceContent, _root);

      // Generate the replacement schema
      const replacement = generateLegacyResourceSchema(
        modelName,
        baseName,
        schemaFields,
        mixinTraits,
        mixinExtensions,
        extensionProperties,
        transformedSource
      );

      if (!defaultExportNode) {
        return transformedSource;
      }

      const original = defaultExportNode.text();
      return transformedSource.replace(original, replacement);
    }
  );
}

/**
 * Resolve import path using additionalModelSources and additionalMixinSources patterns
 */
function resolveImportPath(
  importPath: string,
  additionalModelSources: Array<{ pattern: string; dir: string }> | undefined,
  additionalMixinSources: Array<{ pattern: string; dir: string }> | undefined
): string {
  // Try additionalModelSources first
  if (additionalModelSources) {
    for (const source of additionalModelSources) {
      if (matchesPattern(importPath, source.pattern)) {
        return replacePattern(importPath, source.pattern, source.dir);
      }
    }
  }

  // Try additionalMixinSources
  if (additionalMixinSources) {
    for (const source of additionalMixinSources) {
      if (matchesPattern(importPath, source.pattern)) {
        return replacePattern(importPath, source.pattern, source.dir);
      }
    }
  }

  // If no pattern matches, return the original path
  return importPath;
}

/**
 * Check if an import path matches a pattern (supports wildcards)
 */
function matchesPattern(importPath: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    // Convert wildcard pattern to regex
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(importPath);
  }
  // Exact match
  return importPath === pattern;
}

/**
 * Replace pattern in import path with directory (supports wildcards)
 */
function replacePattern(importPath: string, pattern: string, dir: string): string {
  if (pattern.includes('*')) {
    // For wildcard patterns, we need to extract the matched part and replace it
    const regexPattern = pattern.replace(/\*/g, '(.*)');
    const regex = new RegExp(`^${regexPattern}$`);
    const match = importPath.match(regex);

    if (match) {
      // Replace the wildcard part with the directory
      const wildcardPart = match[1]; // The part that matched the *
      return dir.replace(/\*/g, wildcardPart);
    }
  }

  // For exact matches, simple replacement
  return importPath.replace(pattern, dir);
}

/**
 * Process intermediate models to generate trait artifacts
 * This should be called before processing regular models that extend these intermediate models
 * Models are processed in dependency order to ensure base traits exist before dependent traits
 */
export function processIntermediateModelsToTraits(
  intermediateModelPaths: string[],
  additionalModelSources: Array<{ pattern: string; dir: string }> | undefined,
  additionalMixinSources: Array<{ pattern: string; dir: string }> | undefined,
  options: TransformOptions
): { artifacts: TransformArtifact[]; errors: string[] } {
  const artifacts: TransformArtifact[] = [];
  const errors: string[] = [];

  // First, load all intermediate models and analyze their dependencies
  const modelInfoMap = new Map<
    string,
    {
      filePath: string;
      source: string;
      dependencies: string[];
      processed: boolean;
    }
  >();

  for (const modelPath of intermediateModelPaths) {
    // Convert import path to file system path
    let relativePath: string;
    if (modelPath.startsWith('soxhub-client/')) {
      // Convert soxhub-client paths to relative paths from the current working directory
      // e.g., 'soxhub-client/core/data-field-model' -> './app/core/data-field-model'
      relativePath = modelPath.replace('soxhub-client/', './app/');
    } else {
      // Try to resolve using additionalModelSources and additionalMixinSources
      relativePath = resolveImportPath(modelPath, additionalModelSources || [], additionalMixinSources || []);
      debugLog(options, `DEBUG: Resolved path for ${modelPath}: ${relativePath}`);
    }
    const possiblePaths = [`${relativePath}.ts`, `${relativePath}.js`];

    let filePath: string | null = null;
    let source: string | null = null;

    for (const possiblePath of possiblePaths) {
      try {
        if (existsSync(possiblePath)) {
          filePath = possiblePath;
          source = readFileSync(possiblePath, 'utf-8');
          break;
        }
      } catch (error) {
        debugLog(options, `Could not read ${possiblePath}: ${String(error)}`);
      }
    }

    if (!filePath || !source) {
      errors.push(`Could not find or read intermediate model file for path: ${modelPath}`);
      continue;
    }

    // Analyze dependencies (which other intermediate models this one extends)
    const dependencies: string[] = [];
    for (const otherPath of intermediateModelPaths) {
      if (otherPath !== modelPath && source.includes(`from '${otherPath}'`)) {
        dependencies.push(otherPath);
      }
    }

    modelInfoMap.set(modelPath, {
      filePath,
      source,
      dependencies,
      processed: false,
    });
  }

  // Process models in dependency order using a simple topological sort
  function processModel(modelPath: string): void {
    const modelInfo = modelInfoMap.get(modelPath);
    if (!modelInfo || modelInfo.processed) {
      return;
    }

    // First process dependencies
    for (const dep of modelInfo.dependencies) {
      processModel(dep);
    }

    // Now process this model
    try {
      debugLog(options, `Processing intermediate model: ${modelPath}`);

      // Process the intermediate model to generate trait artifacts
      const traitArtifacts = generateIntermediateModelTraitArtifacts(
        modelInfo.filePath,
        modelInfo.source,
        modelPath,
        options
      );

      // If we have a traitsDir, write the artifacts immediately so subsequent models can reference them
      if ((options.traitsDir || options.extensionsDir) && !options.dryRun) {
        for (const artifact of traitArtifacts) {
          let baseDir: string | undefined;

          if (
            (artifact.type === 'trait' || artifact.type === 'trait-type') &&
            options.traitsDir
          ) {
            baseDir = options.traitsDir;
          } else if ((artifact.type === 'extension' || artifact.type === 'extension-type') && options.extensionsDir) {
            baseDir = options.extensionsDir;
          }

          if (baseDir) {
            const artifactPath = join(baseDir, artifact.suggestedFileName);
            // Ensure directory exists
            mkdirSync(dirname(artifactPath), { recursive: true });
            // Write the file
            writeFileSync(artifactPath, artifact.code, 'utf-8');
            debugLog(options, `Wrote ${artifact.type}: ${artifactPath}`);
          }
        }
      }

      artifacts.push(...traitArtifacts);
      debugLog(options, `Generated ${traitArtifacts.length} artifacts for ${modelPath}`);
    } catch (error) {
      errors.push(`Error processing intermediate model ${modelPath}: ${String(error)}`);
    }

    modelInfo.processed = true;
  }

  // Process all models
  for (const modelPath of intermediateModelPaths) {
    processModel(modelPath);
  }

  return { artifacts, errors };
}

/**
 * Produce zero, one, or more artifacts for a given model file:
 * - Schema artifact when attr/hasMany/belongsTo fields are present
 * - Extension artifact when non-schema properties (methods, computeds) are present
 * - Type artifacts for schema, extension, and trait interfaces
 *
 * This does not modify the original source. The CLI can use this to write
 * files to the requested output directories.
 */
export function toArtifacts(filePath: string, source: string, options: TransformOptions): TransformArtifact[] {
  debugLog(options, `=== DEBUG: Processing ${filePath} ===`);

  const analysis = analyzeModelFile(filePath, source, options);

  if (!analysis.isValid) {
    debugLog(options, 'Model analysis failed, skipping artifact generation');
    return [];
  }

  const { schemaFields, extensionProperties, mixinTraits, mixinExtensions, modelName, baseName, defaultExportNode } =
    analysis;

  // Parse the source to get the root node for class detection
  const language = getLanguageFromPath(filePath);
  const ast = parse(language, source);
  const root = ast.root();

  const artifacts: TransformArtifact[] = [];

  // Always create a schema artifact (even if it only has traits/extensions from mixins)
  const schemaName = `${modelName}Schema`;
  const code = generateSchemaCode(
    schemaName,
    baseName,
    schemaFields,
    mixinTraits,
    mixinExtensions,
    source,
    defaultExportNode,
    root
  );
  // Determine the file extension based on the original model file
  const originalExtension = filePath.endsWith('.ts') ? '.ts' : '.js';

  artifacts.push({
    type: 'schema',
    name: schemaName,
    code,
    suggestedFileName: `${baseName}.schema${originalExtension}`,
  });

  // Create schema type interface
  const schemaInterfaceName = `${modelName}`;

  // Collect imports needed for schema interface
  const schemaImports = new Set<string>();

  // Collect schema field types - start with [Type] symbol
  const schemaFieldTypes = [
    {
      name: '[Type]',
      type: `'${baseName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}'`,
      readonly: true,
    },
    ...schemaFields.map((field) => {
      let type: string;
      switch (field.kind) {
        case 'attribute':
          type = getTypeScriptTypeForAttribute(
            field.type || 'unknown',
            !!(field.options && 'defaultValue' in field.options),
            !field.options || field.options.allowNull !== false,
            options,
            field.options
          ).tsType;
          break;
        case 'belongsTo':
          type = getTypeScriptTypeForBelongsTo(field, options);
          break;
        case 'hasMany':
          type = getTypeScriptTypeForHasMany(field, options);
          break;
        default:
          type = 'unknown';
      }

      return {
        name: field.name,
        type,
        readonly: true,
      };
    }),
  ];

  // Collect schema field types
  const commonImports = generateCommonWarpDriveImports(options);
  schemaImports.add(commonImports.typeImport);

  // Add any specific imports needed by field types
  schemaFields.forEach((field) => {
    if (field.kind === 'belongsTo' || field.kind === 'hasMany') {
      if (field.type && field.type !== baseName) {
        const typeName = toPascalCase(field.type);

        // Check if this is a special case that should be imported as a trait
        if (field.type === 'workflowable') {
          // Import workflowable as a trait, not a resource
          const traitImport = options?.traitsImport
            ? `type { ${typeName} } from '${options.traitsImport}/${field.type}.schema.types'`
            : `type { ${typeName} } from '../traits/${field.type}.schema.types'`;
          schemaImports.add(traitImport);
        } else {
          schemaImports.add(transformModelToResourceImport(field.type, typeName, options));
        }

        // Add HasMany type imports for hasMany relationships
        if (field.kind === 'hasMany') {
          const isAsync = field.options && field.options.async === true;
          if (isAsync) {
            schemaImports.add(commonImports.asyncHasManyImport);
          } else {
            schemaImports.add(commonImports.hasManyImport);
          }
        }
      }
    }
  });

  // Add imports for trait interfaces
  if (mixinTraits.length > 0) {
    mixinTraits.forEach((trait) => {
      const traitTypeName = `${toPascalCase(trait)}Trait`;
      // Import trait type - use configured path or default to relative
      debugLog(options, `Generating trait import for ${trait}: traitsImport = ${options?.traitsImport}`);
      const traitImport = options?.traitsImport
        ? `type { ${traitTypeName} } from '${options.traitsImport}/${trait}.schema.types'`
        : `type { ${traitTypeName} } from '../traits/${trait}.schema.types'`;
      schemaImports.add(traitImport);
    });
  }

  // Add import for extension signature interface if there are extension properties
  if (extensionProperties.length > 0) {
    const extensionSignatureInterface = `${modelName}ExtensionSignature`;
    const extensionImport = options?.extensionsImport
      ? `type { ${extensionSignatureInterface} } from '${options.extensionsImport}/${baseName}'`
      : `type { ${extensionSignatureInterface} } from '../extensions/${baseName}'`;
    schemaImports.add(extensionImport);
  }

  // Determine extends clause for schema interface - only include trait and extension interfaces
  let extendsClause: string | undefined;
  if (mixinTraits.length > 0) {
    // Add trait interfaces to extends clause
    const traitInterfaces = mixinTraits.map((trait) => `${toPascalCase(trait)}Trait`);
    extendsClause = traitInterfaces.join(', ');
  }
  if (extensionProperties.length > 0) {
    const extensionInterface = `${modelName}ExtensionSignature`;
    if (extendsClause) {
      extendsClause += `, ${extensionInterface}`;
    } else {
      extendsClause = extensionInterface;
    }
  }

  const schemaTypeArtifact = createTypeArtifact(
    baseName,
    schemaInterfaceName,
    schemaFieldTypes,
    'resource',
    extendsClause,
    Array.from(schemaImports),
    '.ts' // Type files should always be .ts regardless of source file extension
  );
  artifacts.push(schemaTypeArtifact);

  // Create extension artifact preserving original file content
  // For models, extensions should extend the model interface
  const modelInterfaceName = modelName;
  const modelImportPath = options?.resourcesImport
    ? `${options.resourcesImport}/${baseName}.schema.types`
    : `../resources/${baseName}.schema.types`;
  const extensionArtifact = createExtensionFromOriginalFile(
    filePath,
    source,
    baseName,
    `${modelName}Extension`,
    extensionProperties,
    analysis.defaultExportNode,
    options,
    modelInterfaceName,
    modelImportPath
  );

  debugLog(options, `Extension artifact created: ${!!extensionArtifact}`);
  if (extensionArtifact) {
    artifacts.push(extensionArtifact);
  }

  // Create extension signature type alias if there are extension properties
  debugLog(
    options,
    `Extension properties length: ${extensionProperties.length}, extensionArtifact exists: ${!!extensionArtifact}`
  );
  debugLog(options, `Extension properties: ${JSON.stringify(extensionProperties.map((p) => p.name))}`);
  if (extensionProperties.length > 0 && extensionArtifact) {
    const extensionSignatureType = `${modelName}ExtensionSignature`;
    const extensionClassName = `${modelName}Extension`;

    // Check if the extension file is TypeScript or JavaScript
    const isTypeScript = extensionArtifact.suggestedFileName.endsWith('.ts');

    if (isTypeScript) {
      // Generate TypeScript type alias
      const signatureCode = `export type ${extensionSignatureType} = typeof ${extensionClassName};`;
      extensionArtifact.code += '\n\n' + signatureCode;
    } else {
      // For JavaScript files, generate the @this {Type} pattern with base class
      const jsdocCode = generateJavaScriptExtensionJSDoc(extensionClassName, modelInterfaceName, modelImportPath);

      // Check if the base class pattern is already present to avoid duplication
      if (!extensionArtifact.code.includes('const Base = class {};')) {
        // Add the JSDoc comments and base class before the existing class declaration
        // and modify the class to extend Base
        extensionArtifact.code = extensionArtifact.code.replace(
          `export class ${extensionClassName} {`,
          `${jsdocCode}
export class ${extensionClassName} extends Base {`
        );
      } else {
        // Just modify the class to extend Base if the pattern is already there
        extensionArtifact.code = extensionArtifact.code.replace(
          `export class ${extensionClassName} {`,
          `export class ${extensionClassName} extends Base {`
        );
      }

      // Add the signature typedef at the end of the file
      const signatureTypedef = `/** @typedef {typeof ${extensionClassName}} ${extensionSignatureType} */`;
      extensionArtifact.code += '\n\n' + signatureTypedef;
    }

    debugLog(options, `Extension file length after adding signature: ${extensionArtifact.code.length}`);
  }

  // Generate trait type interfaces for mixins
  // TODO: This would require analyzing the mixin files, which is out of scope for this transform
  // For now, we'll just note which traits are needed

  return artifacts;
}

/**
 * Get the local names of EmberData decorators imported from valid sources
 */

/**
 * Generate trait artifacts for intermediate models (like DataFieldModel)
 * These become traits that other models can include
 */
function generateIntermediateModelTraitArtifacts(
  filePath: string,
  source: string,
  modelPath: string,
  options: TransformOptions
): TransformArtifact[] {
  const artifacts: TransformArtifact[] = [];

  // Extract the trait name from the model path
  // e.g., "soxhub-client/core/data-field-model" -> "data-field"
  const traitBaseName =
    modelPath
      .split('/')
      .pop()
      ?.replace(/-?model$/i, '') || modelPath;
  const traitName = traitBaseName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');

  const traitPascalName = toPascalCase(traitName);

  // Analyze the intermediate model file to extract fields
  const analysis = analyzeModelFile(filePath, source, options);

  if (!analysis.isValid) {
    debugLog(options, `Intermediate model ${modelPath} analysis failed, skipping trait generation`);
    return [];
  }

  const { schemaFields, extensionProperties, mixinTraits, defaultExportNode } = analysis;
  debugLog(
    options,
    `DEBUG: defaultExportNode in generateIntermediateModelTraitArtifacts: ${defaultExportNode ? 'defined' : 'undefined'}`
  );

  // Generate trait schema artifact
  const traitSchemaName = `${traitPascalName}Trait`;
  const traitCode = generateTraitSchemaCode(traitSchemaName, traitName, schemaFields, mixinTraits);

  // Determine the file extension based on the original model file
  const originalExtension = filePath.endsWith('.ts') ? '.ts' : '.js';

  artifacts.push({
    type: 'trait',
    name: traitSchemaName,
    code: traitCode,
    suggestedFileName: `${traitName}.schema${originalExtension}`,
  });

  // Generate trait type interface
  const traitFieldTypes = schemaFields.map((field) => {
    let type: string;
    switch (field.kind) {
      case 'attribute':
        type = getTypeScriptTypeForAttribute(
          field.type || 'unknown',
          !!(field.options && 'defaultValue' in field.options),
          !field.options || field.options.allowNull !== false,
          options,
          field.options
        ).tsType;
        break;
      case 'belongsTo':
        type = getTypeScriptTypeForBelongsTo(field, options);
        break;
      case 'hasMany':
        type = getTypeScriptTypeForHasMany(field, options);
        break;
      default:
        type = 'unknown';
    }

    return {
      name: field.name,
      type,
      readonly: true,
    };
  });

  // Collect imports for trait interface
  const traitImports = new Set<string>();
  const commonImports = generateCommonWarpDriveImports(options);

  // Add any specific imports needed by field types
  schemaFields.forEach((field) => {
    if (field.kind === 'belongsTo' || field.kind === 'hasMany') {
      if (field.type && field.type !== traitName) {
        const typeName = toPascalCase(field.type);

        // Check if this is a special case that should be imported as a trait
        if (field.type === 'workflowable') {
          // Import workflowable as a trait, not a resource
          const traitImport = options?.traitsImport
            ? `type { ${typeName} } from '${options.traitsImport}/${field.type}.schema.types'`
            : `type { ${typeName} } from '../traits/${field.type}.schema.types'`;
          traitImports.add(traitImport);
        } else {
          traitImports.add(transformModelToResourceImport(field.type, typeName, options));
        }

        // Add HasMany type imports for hasMany relationships
        if (field.kind === 'hasMany') {
          const isAsync = field.options && field.options.async === true;
          if (isAsync) {
            traitImports.add(commonImports.asyncHasManyImport);
          } else {
            traitImports.add(commonImports.hasManyImport);
          }
        }
      }
    }
  });

  // Add imports for other traits this trait extends
  if (mixinTraits.length > 0) {
    mixinTraits.forEach((trait) => {
      const otherTraitTypeName = `${toPascalCase(trait)}Trait`;

      // Check if the trait file actually exists before adding import
      if (options?.traitsDir) {
        const traitFilePath = join(options.traitsDir, `${trait}.schema.types.ts`);
        if (!existsSync(traitFilePath)) {
          debugLog(options, `Skipping trait import for '${trait}' - file does not exist at ${traitFilePath}`);
          return;
        }
      }

      // Import trait type - use configured path or default to relative
      const traitImport = options?.traitsImport
        ? `type { ${otherTraitTypeName} } from '${options.traitsImport}/${trait}.schema.types'`
        : `type { ${otherTraitTypeName} } from './${trait}.schema.types'`;
      traitImports.add(traitImport);
    });
  }

  // Determine extends clause for trait interface
  let extendsClause: string | undefined;
  if (mixinTraits.length > 0) {
    // Only include traits that actually exist
    const validTraits = mixinTraits.filter((trait) => {
      if (options?.traitsDir) {
        const traitFilePath = join(options.traitsDir, `${trait}.schema.types.ts`);
        return existsSync(traitFilePath);
      }
      return true; // If no traitsDir, assume it exists
    });

    if (validTraits.length > 0) {
      const traitInterfaces = validTraits.map((trait) => `${toPascalCase(trait)}Trait`);
      extendsClause = traitInterfaces.join(', ');
    }
  }

  // For traits with extension properties, we don't add them to the trait interface
  // Extensions are handled separately as mixins/decorators
  if (extensionProperties.length > 0) {
    // Create the extension artifact preserving original file content
    // For traits, extensions should extend the trait interface
    const traitInterfaceName = traitPascalName;
    const traitImportPath = options?.traitsImport
      ? `${options.traitsImport}/${traitName}.schema.types`
      : `../traits/${traitName}.schema.types`;
    const extensionArtifact = createExtensionFromOriginalFile(
      filePath,
      source,
      traitName,
      `${traitPascalName}Extension`,
      extensionProperties,
      defaultExportNode,
      options,
      traitInterfaceName,
      traitImportPath
    );
    if (extensionArtifact) {
      artifacts.push(extensionArtifact);

      // Create extension signature type alias if there are extension properties
      const extensionSignatureType = `${traitPascalName}ExtensionSignature`;
      const extensionClassName = `${traitPascalName}Extension`;

      // Check if the extension file is TypeScript or JavaScript
      const isTypeScript = extensionArtifact.suggestedFileName.endsWith('.ts');

      let signatureCode: string;
      if (isTypeScript) {
        // Generate TypeScript type alias
        signatureCode = `export type ${extensionSignatureType} = typeof ${extensionClassName};`;
      } else {
        // Generate JSDoc type alias for JavaScript files
        signatureCode = `/** @typedef {typeof ${extensionClassName}} ${extensionSignatureType} */`;
      }

      // Add the signature type alias to the extension file
      extensionArtifact.code += '\n\n' + signatureCode;
    }
  }

  const traitTypeArtifact = createTypeArtifact(
    traitName,
    traitSchemaName,
    traitFieldTypes,
    'trait',
    extendsClause,
    Array.from(traitImports)
  );
  artifacts.push(traitTypeArtifact);

  return artifacts;
}

/**
 * Get local import names for intermediate model classes
 */
function getIntermediateModelLocalNames(
  root: SgNode,
  intermediateModelPaths: string[],
  options?: TransformOptions
): string[] {
  const localNames: string[] = [];

  for (const modelPath of intermediateModelPaths) {
    const localName = findEmberImportLocalName(root, [modelPath], options, undefined, process.cwd());
    if (localName) {
      localNames.push(localName);
      debugLog(options, `DEBUG: Found intermediate model local name: ${localName} for path: ${modelPath}`);
    }
  }

  return localNames;
}

/**
 * Check if a default export is a class extending a Model
 */
function isModelClass(
  exportNode: SgNode,
  modelLocalName: string | undefined,
  baseModelLocalName: string | undefined,
  root: SgNode,
  options?: TransformOptions
): boolean {
  debugLog(
    options,
    `DEBUG: Checking if export extends model '${modelLocalName}' or base model '${baseModelLocalName}'`
  );

  // Look for a class declaration in the export
  let classDeclaration = exportNode.find({ rule: { kind: 'class_declaration' } });

  // If no class declaration found in export, check if export references a class by name
  if (!classDeclaration) {
    debugLog(options, 'DEBUG: No class declaration found in export, checking for exported class name');

    // Get the exported identifier name
    const exportedIdentifier = getExportedIdentifier(exportNode, options);
    if (exportedIdentifier) {
      debugLog(options, `DEBUG: Found exported identifier: ${exportedIdentifier}`);

      // Look for a class declaration with this name in the root
      classDeclaration = root.find({
        rule: {
          kind: 'class_declaration',
          has: {
            kind: 'identifier',
            text: exportedIdentifier,
          },
        },
      });

      if (classDeclaration) {
        debugLog(options, `DEBUG: Found class declaration for exported identifier: ${exportedIdentifier}`);
      } else {
        debugLog(options, `DEBUG: No class declaration found for exported identifier: ${exportedIdentifier}`);
        // Let's try a different approach - find all class declarations and check their names
        const allClassDeclarations = root.findAll({ rule: { kind: 'class_declaration' } });
        debugLog(options, `DEBUG: Found ${allClassDeclarations.length} class declarations in file`);
        for (const cls of allClassDeclarations) {
          const className = cls.find({ rule: { kind: 'identifier' } });
          if (className) {
            debugLog(options, `DEBUG: Class declaration found with name: ${className.text()}`);
          }
        }
      }
    } else {
      debugLog(options, 'DEBUG: No exported identifier found');
    }
  }

  if (!classDeclaration) {
    debugLog(options, 'DEBUG: No class declaration found in export or by name');
    return false;
  }

  debugLog(options, `DEBUG: Found class declaration: ${classDeclaration.text().slice(0, 100)}...`);
  debugLog(
    options,
    `DEBUG: Class children: ${classDeclaration
      .children()
      .map((c) => `${c.kind()}:${c.text().slice(0, 20)}`)
      .join(', ')}`
  );

  // Check if the class has a heritage clause (extends)
  const heritageClause = classDeclaration.find({ rule: { kind: 'class_heritage' } });
  if (!heritageClause) {
    debugLog(options, 'DEBUG: No class_heritage found in class');
    return false;
  }

  // Check if it extends our model local name or calls .extend() on it
  const extendsText = heritageClause.text();
  debugLog(options, `DEBUG: Heritage clause: ${extendsText}`);

  // Check for direct Model extension
  let isDirectExtension = false;
  let isMixinExtension = false;

  if (modelLocalName) {
    isDirectExtension = extendsText.includes(modelLocalName);
    isMixinExtension = extendsText.includes(`${modelLocalName}.extend(`);
  }

  // Check for custom base model extension
  let isBaseModelExtension = false;
  if (baseModelLocalName) {
    isBaseModelExtension =
      extendsText.includes(baseModelLocalName) || extendsText.includes(`${baseModelLocalName}.extend(`);
  }

  // Check for chained extends through configured intermediate classes
  let isChainedExtension = false;
  if (options?.intermediateModelPaths && options.intermediateModelPaths.length > 0) {
    const intermediateLocalNames = getIntermediateModelLocalNames(root, options.intermediateModelPaths, options);
    isChainedExtension = intermediateLocalNames.some((localName) => extendsText.includes(localName));
    if (isChainedExtension) {
      debugLog(
        options,
        `DEBUG: Found chained extension through intermediate model: ${intermediateLocalNames.find((name) => extendsText.includes(name))}`
      );
    }
  }

  debugLog(
    options,
    `DEBUG: Direct extension: ${isDirectExtension}, Mixin extension: ${isMixinExtension}, Base model extension: ${isBaseModelExtension}, Chained extension: ${isChainedExtension}`
  );

  return isDirectExtension || isMixinExtension || isBaseModelExtension || isChainedExtension;
}

/**
 * Extract fields that can become schema fields (attr, hasMany, belongsTo)
 * and other properties that need to become extensions
 */
function extractModelFields(
  root: SgNode,
  emberDataImports: Map<string, string>,
  filePath: string,
  options?: TransformOptions
): {
  schemaFields: SchemaField[];
  extensionProperties: Array<{ name: string; originalKey: string; value: string; typeInfo?: ExtractedType; isObjectMethod?: boolean }>;
  mixinTraits: string[];
  mixinExtensions: string[];
} {
  const schemaFields: SchemaField[] = [];
  const extensionProperties: Array<{ name: string; originalKey: string; value: string; typeInfo?: ExtractedType }> = [];
  const mixinTraits: string[] = [];
  const mixinExtensions: string[] = [];

  // Check if this is a JavaScript file - skip type extraction for JS files
  const isJavaScriptFile = filePath.endsWith('.js');

  // Find the class declaration
  const classDeclaration = root.find({ rule: { kind: 'class_declaration' } });
  if (!classDeclaration) {
    debugLog(options, 'DEBUG: No class declaration found in extractModelFields');
    return { schemaFields, extensionProperties, mixinTraits, mixinExtensions };
  }
  debugLog(options, 'DEBUG: Found class declaration in extractModelFields');

  // Extract mixin information from extends clause
  const heritageClause = classDeclaration.find({ rule: { kind: 'class_heritage' } });
  if (heritageClause) {
    // Get mixin imports to map local names to file paths
    const mixinImports = getMixinImports(root, options);
    mixinTraits.push(...extractMixinTraits(heritageClause, root, mixinImports, options));

    // Extract intermediate model traits
    if (options?.intermediateModelPaths && options.intermediateModelPaths.length > 0) {
      const intermediateTraits = extractIntermediateModelTraits(
        heritageClause,
        root,
        options.intermediateModelPaths,
        options
      );
      mixinTraits.push(...intermediateTraits);
    }
  }

  // Get the class body
  const classBody = classDeclaration.find({ rule: { kind: 'class_body' } });
  if (!classBody) {
    debugLog(options, 'DEBUG: No class body found');
    return { schemaFields, extensionProperties, mixinTraits, mixinExtensions };
  }
  debugLog(options, 'DEBUG: Found class body, looking for properties...');

  // Get all property definitions within the class body
  let propertyDefinitions: SgNode[] = [];
  let methodDefinitions: SgNode[] = [];

  try {
    // First, let's see what node types are actually available in TypeScript
    if (options?.debug) {
      const allChildren = classBody.children();
      const nodeTypes = allChildren.map((child) => child.kind()).join(', ');
      debugLog(options, `DEBUG: All class body node types: ${nodeTypes}`);
    }

    // Try different possible AST node types for class fields with error handling
    const nodeTypes = ['field_definition', 'public_field_definition', 'class_field', 'property_signature'];

    for (const nodeType of nodeTypes) {
      try {
        propertyDefinitions = classBody.findAll({ rule: { kind: nodeType } });
        if (propertyDefinitions.length > 0) {
          debugLog(options, `DEBUG: Found ${propertyDefinitions.length} properties using node type: ${nodeType}`);
          break;
        }
      } catch {
        // Node type not supported in this AST, continue to next
        debugLog(options, `DEBUG: Node type ${nodeType} not supported, trying next...`);
      }
    }

    methodDefinitions = classBody.findAll({ rule: { kind: 'method_definition' } });

    debugLog(options, `DEBUG: Found ${propertyDefinitions.length} properties and ${methodDefinitions.length} methods`);
    debugLog(options, `DEBUG: Class body text: ${classBody.text().substring(0, 200)}...`);
    // List all child node types in the class body
    const childTypes = classBody
      .children()
      .map((child) => child.kind())
      .join(', ');
    debugLog(options, `DEBUG: Class body child types: ${childTypes}`);
  } catch (error) {
    errorLog(options, `DEBUG: Error finding properties: ${String(error)}`);
    return { schemaFields, extensionProperties, mixinTraits, mixinExtensions };
  }

  // Process property definitions
  for (const property of propertyDefinitions) {
    // For field_definition nodes, the name is in a property_identifier child
    // We want the LAST property_identifier, as the first ones might be from decorator arguments
    const nameNodes = property.findAll({ rule: { kind: 'property_identifier' } });
    const nameNode = nameNodes[nameNodes.length - 1]; // Get the last one

    if (!nameNode) {
      continue;
    }

    const fieldName = nameNode.text();
    const originalKey = fieldName;

    // Extract TypeScript type information (skip for JavaScript files)
    let typeInfo: ExtractedType | undefined;
    if (!isJavaScriptFile) {
      try {
        typeInfo = extractTypeFromDeclaration(property, options) ?? undefined;
      } catch (error) {
        debugLog(options, `DEBUG: Error extracting type for ${fieldName}: ${String(error)}`);
      }
    }

    // Check if this property has a decorator
    const decorators = property.findAll({ rule: { kind: 'decorator' } });
    let isSchemaField = false;

    for (const decorator of decorators) {
      // Extract just the decorator name (before any parentheses or generics)
      const decoratorText = decorator.text().replace('@', '');
      // Split by '(' first to get the part before arguments, then by '<' to remove generics
      const decoratorName = decoratorText.split('(')[0].split('<')[0];

      if (!decoratorName) continue;

      // Check if this is an EmberData decorator
      if (emberDataImports.has(decoratorName)) {
        const originalDecoratorName = emberDataImports.get(decoratorName);
        if (!originalDecoratorName) continue;

        // Parse the decorator arguments if present
        const decoratorArgs = parseDecoratorArgumentsWithNodes(decorator);

        // Extract type from decorator if we don't have explicit type annotation
        if (!typeInfo) {
          try {
            typeInfo = extractTypeFromDecoratorWithNodes(originalDecoratorName, decoratorArgs, options) ?? undefined;
          } catch (error) {
            debugLog(options, `DEBUG: Error extracting type from decorator for ${fieldName}: ${String(error)}`);
          }
        }

        const schemaField = convertToSchemaFieldWithNodes(fieldName, originalDecoratorName, decoratorArgs);
        if (schemaField) {
          schemaFields.push(schemaField);
          isSchemaField = true;
          break;
        }
      }
    }

    // If it's not a schema field, add it as an extension property
    if (!isSchemaField) {
      // For field declarations without initializers, we use the whole field definition as the value
      extensionProperties.push({
        name: fieldName,
        originalKey,
        value: property.text(),
        typeInfo,
        isObjectMethod: isClassMethodSyntax(property),
      });
    }
  }

  // Process method definitions (always extension properties)
  for (const method of methodDefinitions) {
    const nameNode = method.field('name');
    if (!nameNode) continue;

    const methodName = nameNode.text();

    // Find any decorators that come before this method
    const decorators: string[] = [];
    const siblings = method.parent()?.children() ?? [];
    const methodIndex = siblings.indexOf(method);

    // Look backwards from the method to find decorators
    for (let i = methodIndex - 1; i >= 0; i--) {
      const sibling = siblings[i];
      if (!sibling) continue;

      if (sibling.kind() === 'decorator') {
        decorators.unshift(sibling.text()); // Add to beginning to maintain order
      } else if (sibling.text().trim() !== '') {
        // Stop at non-empty, non-decorator content
        break;
      }
    }

    // Combine decorators with method text
    const methodText = decorators.length > 0 ? decorators.join('\n') + '\n' + method.text() : method.text();

    // Extract TypeScript type information from method (skip for JavaScript files)
    let typeInfo: ExtractedType | undefined;
    if (!isJavaScriptFile) {
      try {
        typeInfo = extractTypeFromMethod(method, options) ?? undefined;
      } catch (error) {
        debugLog(options, `DEBUG: Error extracting type for method ${methodName}: ${String(error)}`);
      }
    }

    // Preserve the original method syntax wholesale (including decorators, get, async, etc.)
    extensionProperties.push({
      name: methodName,
      originalKey: methodName,
      value: methodText,
      typeInfo,
      isObjectMethod: isClassMethodSyntax(method),
    });
  }

  if (options?.debug) {
    debugLog(
      options,
      `Extracted ${schemaFields.length} schema fields, ${extensionProperties.length} extension properties`
    );
    debugLog(options, `Mixin traits: ${mixinTraits.join(', ')}`);
  }

  return { schemaFields, extensionProperties, mixinTraits, mixinExtensions };
}

/**
 * Extract intermediate model names from heritage clause and convert to trait names
 */
function extractIntermediateModelTraits(
  heritageClause: SgNode,
  root: SgNode,
  intermediateModelPaths: string[],
  options?: TransformOptions
): string[] {
  const intermediateTraits: string[] = [];
  const extendsText = heritageClause.text();

  // Get local names for all intermediate models
  const intermediateLocalNames = getIntermediateModelLocalNames(root, intermediateModelPaths, options);

  for (const localName of intermediateLocalNames) {
    if (extendsText.includes(localName)) {
      // Convert the import path to a trait name
      const modelPath = intermediateModelPaths.find((path) => {
        const pathLocalName = findEmberImportLocalName(root, [path], options, undefined, process.cwd());
        return pathLocalName === localName;
      });

      if (modelPath) {
        // Convert path like "soxhub-client/core/data-field-model" to "data-field-model"
        const traitName = modelPath.split('/').pop() || modelPath;
        const dasherizedName = traitName
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^-/, '')
          .replace(/-?model$/, ''); // Remove trailing -model or model

        intermediateTraits.push(dasherizedName);
        debugLog(options, `DEBUG: Found intermediate model trait: ${dasherizedName} from ${modelPath}`);
      }
      break; // Only process the first match since a class can only extend one parent
    }
  }

  return intermediateTraits;
}

/**
 * Extract mixin names from heritage clause and convert to trait names
 */
function extractMixinTraits(
  heritageClause: SgNode,
  root: SgNode,
  mixinImports: Map<string, string>,
  options?: TransformOptions
): string[] {
  const mixinTraits: string[] = [];

  // Find the .extend() call using AST
  const extendCall = heritageClause.find({
    rule: {
      kind: 'call_expression',
      has: {
        kind: 'member_expression',
        has: {
          kind: 'property_identifier',
          text: 'extend',
        },
      },
    },
  });

  if (extendCall) {
    // Get the arguments of the .extend() call
    const argumentsNode = extendCall.find({ rule: { kind: 'arguments' } });
    if (argumentsNode) {
      // Find all identifier nodes within the arguments (these are the mixin names)
      const mixinIdentifiers = argumentsNode.findAll({ rule: { kind: 'identifier' } });

      for (const identifierNode of mixinIdentifiers) {
        const mixinName = identifierNode.text();
        debugLog(options, `Found mixin identifier: ${mixinName}`);

        // Check if this is an intermediate model import - if so, skip it as it's handled elsewhere
        if (options?.intermediateModelPaths) {
          const isIntermediateModel = options.intermediateModelPaths.some((path) => {
            const localName = findEmberImportLocalName(root, [path], options, undefined, process.cwd());
            return localName === mixinName;
          });
          if (isIntermediateModel) {
            debugLog(options, `DEBUG: Skipping ${mixinName} as it's an intermediate model, not a mixin`);
            continue;
          }
        }

        // Try to get the import path for this mixin
        const importPath = mixinImports.get(mixinName);

        // Check if this is an external dependency (not from soxhub-client) - skip it as it's a true base model
        if (importPath && !importPath.startsWith('soxhub-client/')) {
          debugLog(
            options,
            `DEBUG: Skipping ${mixinName} as it's an external dependency (${importPath}), not a local mixin`
          );
          continue;
        }
        if (importPath) {
          // Use the import path to generate the trait name (same as mixin-to-schema conversion)
          const traitName = mixinNameToTraitName(importPath, true); // true for string reference (dasherized)
          mixinTraits.push(traitName);
        } else if (mixinImports.size > 0 || importPath !== undefined) {
          // Fallback to using the identifier name if no import found
          // But only if we have a mixin import for this name
          mixinTraits.push(mixinNameToTraitName(mixinName, true));
        }
      }
    }
  }

  return mixinTraits;
}

/**
 * Extract kebab-case base name (without extension) from a path
 */

/**
 * Generate JSDoc pattern for JavaScript extensions with proper type merging
 */
function generateJavaScriptExtensionJSDoc(
  extensionClassName: string,
  modelInterfaceName: string,
  modelImportPath: string
): string {
  return `// The following is a workaround for the fact that we can't properly do
// declaration merging in .js files. If this is converted to a .ts file,
// we can remove this and just use the declaration merging.
/** @import { ${modelInterfaceName} } from '${modelImportPath}' */
/** @type {{ new(): ${modelInterfaceName} }} */
const Base = class {};`;
}

/**
 * Generate LegacyResourceSchema object
 */
function generateLegacyResourceSchema(
  modelName: string,
  type: string,
  schemaFields: SchemaField[],
  mixinTraits: string[],
  mixinExtensions: string[],
  extensionProperties: Array<{ name: string; originalKey: string; value: string }>,
  source?: string
): string {
  const schemaName = `${modelName}Schema`;
  const extensionName = `${modelName}Extension`;

  const objectExtensions = [...mixinExtensions];
  if (extensionProperties.length > 0) {
    objectExtensions.push(extensionName);
  }

  const legacySchema = buildLegacySchemaObject(type, schemaFields, mixinTraits, objectExtensions);

  // Detect quote style from source if provided
  const useSingleQuotes = source ? detectQuoteStyle(source) === 'single' : false;

  return generateExportStatement(schemaName, legacySchema, useSingleQuotes);
}

/**
 * Transform relative model imports in source to schema type imports
 */
function transformModelImportsInSource(source: string, root: SgNode): string {
  let result = source;

  // Find all import declarations
  const imports = root.findAll({ rule: { kind: 'import_statement' } });

  for (const importNode of imports) {
    const importText = importNode.text();

    // Check if this is a relative import to another model file
    // Pattern: import type SomeThing from './some-thing';
    const relativeImportMatch = importText.match(/import\s+type\s+(\w+)\s+from\s+['"](\.\/.+?)['"];?/);

    if (relativeImportMatch) {
      const [fullMatch, typeName, relativePath] = relativeImportMatch;

      // Transform to named import from schema.types
      // e.g., import type SomeThing from './some-thing';
      // becomes import type { SomeThing } from './some-thing.schema.types';
      const transformedImport = `import type { ${typeName} } from '${relativePath}.schema.types';`;

      result = result.replace(fullMatch, transformedImport);
    }
  }

  return result;
}

/** Generate schema code by preserving existing file content and replacing model with schema */
function generateSchemaCode(
  schemaName: string,
  type: string,
  schemaFields: SchemaField[],
  mixinTraits: string[],
  mixinExtensions: string[],
  originalSource: string,
  defaultExportNode: SgNode | null,
  root: SgNode
): string {
  const legacySchema = buildLegacySchemaObject(type, schemaFields, mixinTraits, mixinExtensions);

  // Detect quote style from original source
  const useSingleQuotes = detectQuoteStyle(originalSource) === 'single';
  const exportStatement = generateExportStatement(schemaName, legacySchema, useSingleQuotes);

  // Transform relative model imports to schema type imports
  let transformedSource = transformModelImportsInSource(originalSource, root);

  // If no default export node, just append the schema to the existing content
  if (!defaultExportNode) {
    return `${transformedSource}\n\n${exportStatement}`;
  }

  // Use the already-parsed AST root node

  // Check if the export contains a class declaration directly
  let classDeclaration = defaultExportNode.find({ rule: { kind: 'class_declaration' } });
  debugLog({}, `DEBUG: Class declaration in export: ${classDeclaration ? 'found' : 'not found'}`);

  // If no class declaration found in export, check if export references a class by name
  if (!classDeclaration) {
    // Get the exported identifier name
    const exportedIdentifier = getExportedIdentifier(defaultExportNode, {});
    debugLog({}, `DEBUG: Exported identifier: ${exportedIdentifier}`);
    if (exportedIdentifier) {
      // Look for a class declaration with this name in the root
      classDeclaration = root.find({
        rule: {
          kind: 'class_declaration',
          has: {
            kind: 'identifier',
            text: exportedIdentifier,
          },
        },
      });
      debugLog({}, `DEBUG: Class declaration found by name: ${classDeclaration ? 'found' : 'not found'}`);
    }
  }

  if (classDeclaration) {
    // Check if the class is directly in the export (export default class) or separate
    const exportText = defaultExportNode.text();

    if (exportText.includes('class ')) {
      // Class is directly in the export (export default class XcSuggestion)
      // Remove the entire export statement
      let result = transformedSource.replace(exportText, '');
      // Clean up extra newlines
      result = result.replace(/\n\n\n+/g, '\n\n');
      return `${result}\n${exportStatement}`;
    }
    // Class is separate from export (class XcSuggestion + export default XcSuggestion)
    // Remove both the class declaration and the export statement
    const classText = classDeclaration.text();

    let result = transformedSource.replace(classText, '');
    result = result.replace(exportText, '');

    // Clean up extra newlines
    result = result.replace(/\n\n\n+/g, '\n\n');
    return `${result}\n${exportStatement}`;
  }

  // Fallback: just replace the export statement
  const original = defaultExportNode.text();
  return transformedSource.replace(original, exportStatement);
}

/** Generate only the schema code block (legacy function for compatibility) */
function generateSchemaCodeLegacy(
  schemaName: string,
  type: string,
  schemaFields: SchemaField[],
  mixinTraits: string[],
  mixinExtensions: string[],
  imports = new Set<string>(),
  source?: string
): string {
  const legacySchema = buildLegacySchemaObject(type, schemaFields, mixinTraits, mixinExtensions);

  // Detect quote style from source if provided
  const useSingleQuotes = source ? detectQuoteStyle(source) === 'single' : false;
  const exportStatement = generateExportStatement(schemaName, legacySchema, useSingleQuotes);

  // Include imports if any exist
  if (imports.size > 0) {
    const importStatements = Array.from(imports).sort().join('\n');
    return `${importStatements}\n\n${exportStatement}`;
  }

  return exportStatement;
}
