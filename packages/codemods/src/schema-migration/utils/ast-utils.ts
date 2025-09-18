import type { SgNode } from '@ast-grep/napi';
import { Lang, parse } from '@ast-grep/napi';

export interface TransformOptions {
  verbose?: boolean;
  debug?: boolean;
  dryRun?: boolean;
  /** Use @warp-drive-mirror instead of @warp-drive for imports */
  mirror?: boolean;
  /** Specify alternate import sources for EmberData decorators (default: '@ember-data/model') */
  emberDataImportSource?: string;
  /** List of intermediate model class import paths that should be converted to traits (e.g., ['soxhub-client/core/base-model', 'soxhub-client/core/data-field-model']) */
  intermediateModelPaths?: string[];
  /** Specify base import path for existing model imports to detect and replace (required) */
  modelImportSource?: string;
  /** Specify base import path for existing mixin imports to detect and replace (optional) */
  mixinImportSource?: string;
  /** Directory containing model files for resolving absolute model imports */
  modelSourceDir?: string;
  /** Directory containing mixin files for resolving absolute mixin imports */
  mixinSourceDir?: string;
  /** Additional model source patterns and their corresponding directories */
  additionalModelSources?: Array<{ pattern: string; dir: string }>;
  /** Additional mixin source patterns and their corresponding directories */
  additionalMixinSources?: Array<{ pattern: string; dir: string }>;
  /** Specify base import path for new resource type imports (required) */
  resourcesImport?: string;
  /** Directory to write generated resource schemas to */
  resourcesDir?: string;
  /** Directory to write generated extension files to */
  extensionsDir?: string;
  /** Directory to write generated trait files to */
  traitsDir?: string;
  /** Base import path for trait type imports (optional, defaults to relative imports) */
  traitsImport?: string;
  /** Base import path for extension type imports (optional, defaults to relative imports) */
  extensionsImport?: string;
  /** Custom type mappings for EmberData transform types (e.g., 'uuid' -> 'string') */
  typeMapping?: Record<string, string>;
  /** Internal flag to indicate we're processing an intermediate model that should become a trait */
  processingIntermediateModel?: boolean;
}

/**
 * Default import sources for common Ember patterns
 */
export const DEFAULT_EMBER_DATA_SOURCE = '@ember-data/model';
export const DEFAULT_MIXIN_SOURCE = '@ember/object/mixin';
// Note: modelImportSource and resourcesImport must be explicitly configured
// No defaults are provided to avoid hardcoding project-specific paths

/**
 * Transform @warp-drive imports to use @warp-drive-mirror when mirror flag is set
 */
export function transformWarpDriveImport(importPath: string, options?: TransformOptions): string {
  if (options?.mirror && importPath.startsWith('@warp-drive')) {
    return importPath.replace('@warp-drive', '@warp-drive-mirror');
  }
  return importPath;
}

/**
 * Generate a type import statement for WarpDrive types
 */
export function generateWarpDriveTypeImport(
  typeName: string,
  importPath: string,
  options?: TransformOptions,
  includeImportKeyword = false
): string {
  const transformedPath = transformWarpDriveImport(importPath, options);
  const prefix = includeImportKeyword ? 'import ' : '';
  return `${prefix}type { ${typeName} } from '${transformedPath}'${includeImportKeyword ? ';' : ''}`;
}

/**
 * Generate common WarpDrive type imports
 */
export function generateCommonWarpDriveImports(options?: TransformOptions): {
  typeImport: string;
  asyncHasManyImport: string;
  hasManyImport: string;
} {
  return {
    typeImport: generateWarpDriveTypeImport('Type', '@warp-drive/core/types/symbols', options),
    asyncHasManyImport: generateWarpDriveTypeImport('AsyncHasMany', '@ember-data/model', options),
    hasManyImport: generateWarpDriveTypeImport('HasMany', '@ember-data/model', options),
  };
}

/**
 * Get the configured model import source (required - no default provided)
 */
export function getModelImportSource(options?: TransformOptions): string {
  if (!options?.modelImportSource) {
    throw new Error('modelImportSource is required but not provided in configuration');
  }
  return options.modelImportSource;
}

/**
 * Get the configured resources import source (required - no default provided)
 */
export function getResourcesImport(options?: TransformOptions): string {
  if (!options?.resourcesImport) {
    throw new Error('resourcesImport is required but not provided in configuration');
  }
  return options.resourcesImport;
}

/**
 * Transform a model type name to a resource type import path
 * e.g., 'user' with modelImportSource 'my-app/models' and resourcesImport 'my-app/data/resources'
 * becomes 'my-app/data/resources/user.schema.types'
 */
export function transformModelToResourceImport(
  relatedType: string,
  modelName: string,
  options?: TransformOptions
): string {
  const resourcesImport = getResourcesImport(options);
  // Use relatedType for the file path since that's the actual model name
  // Use named import since interfaces are exported as named exports
  return `type { ${modelName} } from '${resourcesImport}/${relatedType}.schema.types'`;
}

/**
 * Built-in type mappings for EmberData transforms
 * Only these four types are directly supported
 */
export const BUILT_IN_TYPE_MAPPINGS: Record<string, string> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'Date',
};

/**
 * Get TypeScript type for an EmberData attribute transform type
 * Uses built-in mappings and optional custom type mappings
 */
export function getTypeScriptTypeForAttribute(
  attrType: string,
  hasDefaultValue: boolean,
  allowNull: boolean,
  options?: TransformOptions,
  fieldOptions?: Record<string, unknown>
): { tsType: string; imports?: string[] } {
  // Handle enum types specially
  if (attrType === 'enum' && fieldOptions?.allowedValues) {
    const allowedValues = fieldOptions.allowedValues as string;

    // Check if this is a complex expression (contains function calls, operators, etc.)
    // If so, fall back to a simple string type instead of trying to generate complex types
    if (!/^[a-z][0-9]\.$/.test(allowedValues)) {
      // For complex expressions, just use string type
      const tsType = allowNull ? 'string | null' : 'string';
      return { tsType };
    }

    // For simple enum types, we need to generate a union type
    // The allowedValues should be the enum name (e.g., "FrameworkUpdateStatus")
    // We'll generate a union type like: (typeof FrameworkUpdateStatus)[keyof typeof FrameworkUpdateStatus]
    const tsType = allowNull
      ? `(typeof ${allowedValues})[keyof typeof ${allowedValues}] | null`
      : `(typeof ${allowedValues})[keyof typeof ${allowedValues}]`;
    return { tsType };
  }

  // Check custom type mappings first
  const customMapping = options?.typeMapping?.[attrType];
  if (customMapping) {
    const tsType = hasDefaultValue || !allowNull ? customMapping : `${customMapping} | null`;
    return { tsType };
  }

  // Check built-in type mappings
  const builtInMapping = BUILT_IN_TYPE_MAPPINGS[attrType];
  if (builtInMapping) {
    let tsType: string;
    if (attrType === 'boolean') {
      // Special handling for boolean nullability
      tsType = allowNull ? 'boolean | null' : 'boolean';
    } else {
      tsType = hasDefaultValue || !allowNull ? builtInMapping : `${builtInMapping} | null`;
    }
    return { tsType };
  }

  // Fallback to unknown for unsupported types
  const tsType = hasDefaultValue || !allowNull ? 'unknown' : 'unknown | null';
  return { tsType };
}

/**
 * Shared artifact interface for both transforms
 */
export interface TransformArtifact {
  /** Type determines output directory routing */
  type: string;
  /** Suggested export name */
  name: string;
  /** Code to write to the artifact file */
  code: string;
  /** Suggested filename (without directory) */
  suggestedFileName: string;
}

/**
 * Interface representing a TypeScript type extracted from the AST
 */
export interface ExtractedType {
  /** The TypeScript type annotation (e.g., 'string | null', 'User[]') */
  type: string;
  /** Whether this is a readonly property */
  readonly?: boolean;
  /** Whether this property is optional */
  optional?: boolean;
  /** Import dependencies needed for this type */
  imports?: string[];
}

/**
 * Interface for property information including TypeScript types
 */
export interface PropertyInfo {
  name: string;
  originalKey: string;
  value: string;
  /** Extracted TypeScript type information */
  typeInfo?: ExtractedType;
}

/**
 * Determine AST language from file path
 */
export function getLanguageFromPath(filePath: string): Lang {
  if (filePath.endsWith('.ts')) {
    return Lang.TypeScript;
  } else if (filePath.endsWith('.js')) {
    return Lang.JavaScript;
  }

  // Default to TypeScript for unknown extensions
  return Lang.TypeScript;
}

/**
 * Extract file extension from path (.js or .ts)
 */
export function getFileExtension(filePath: string): string {
  if (filePath.endsWith('.ts')) {
    return '.ts';
  } else if (filePath.endsWith('.js')) {
    return '.js';
  }

  // Default to .ts for unknown extensions
  return '.ts';
}

/**
 * Get EmberData decorator imports and their local names
 */
export function getEmberDataImports(
  root: SgNode,
  expectedSources: string[] = ['@ember-data/model'],
  options?: TransformOptions
): Map<string, string> {
  const emberDataImports = new Map<string, string>();

  debugLog(options, 'Looking for EmberData imports from:', expectedSources);

  // Find all import statements
  const importStatements = root.findAll({ rule: { kind: 'import_statement' } });

  for (const importNode of importStatements) {
    // Get the source of the import (the string after 'from')
    const source = importNode.field('source');
    if (!source) continue;

    const sourceText = source.text();
    // Remove quotes from source text for comparison
    const cleanSourceText = removeQuotes(sourceText);

    // Check if this import is from one of our expected sources
    if (!expectedSources.includes(cleanSourceText)) {
      continue;
    }

    debugLog(options, `Found EmberData import from: ${cleanSourceText}`);

    // Get the import clause to find named imports
    const importClause = importNode.children().find((child) => child.kind() === 'import_clause');
    if (!importClause) continue;

    // Look for named imports within the import clause
    const namedImports = importClause.findAll({ rule: { kind: 'named_imports' } });
    for (const namedImportNode of namedImports) {
      // Get all import specifiers
      const importSpecifiers = namedImportNode.findAll({ rule: { kind: 'import_specifier' } });

      for (const specifier of importSpecifiers) {
        // Get the imported name and local name
        const nameNode = specifier.field('name'); // The original name from the module
        const aliasNode = specifier.field('alias'); // The local alias (if any)

        if (!nameNode) continue;

        const originalName = nameNode.text();
        const localName = aliasNode ? aliasNode.text() : originalName;

        debugLog(options, `Found EmberData decorator: ${originalName} as ${localName}`);

        emberDataImports.set(localName, originalName);
      }
    }
  }

  return emberDataImports;
}

/**
 * Get mixin imports and their local names, mapping local names to import paths
 */
export function getMixinImports(root: SgNode, options?: TransformOptions): Map<string, string> {
  const mixinImports = new Map<string, string>();

  debugLog(options, 'Looking for mixin imports');

  // Find all import statements
  const importStatements = root.findAll({ rule: { kind: 'import_statement' } });

  for (const importNode of importStatements) {
    // Get the source of the import (the string after 'from')
    const source = importNode.field('source');
    if (!source) continue;

    const sourceText = source.text();
    // Remove quotes from source text
    const importPath = removeQuotes(sourceText);

    // Process both relative imports and absolute imports that could be mixins
    // Skip node_modules imports but allow absolute imports that match mixin patterns
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
      // Check if this is an absolute import that points to a mixin file
      if (!isMixinImportPath(importPath, options) && !isSpecialMixinImport(importPath, options)) {
        continue;
      }
    }

    debugLog(options, `Found potential mixin import from: ${importPath}`);

    // Handle special mixin imports (e.g., workflowable from models)
    let actualImportPath = importPath;
    if (isSpecialMixinImport(importPath, options)) {
      // Convert special mixin import to actual mixin path
      if (importPath === 'soxhub-client/models/workflowable') {
        actualImportPath = 'soxhub-client/mixins/workflowable';
      }
    }

    // Check for default imports
    const importClause = importNode.children().find((child) => child.kind() === 'import_clause');
    if (!importClause) continue;

    // Look for default import
    const identifierNodes = importClause.findAll({ rule: { kind: 'identifier' } });
    for (const identifierNode of identifierNodes) {
      const localName = identifierNode.text();
      // Skip 'from' keyword
      if (localName === 'from') continue;

      debugLog(options, `Found mixin import: ${localName} from ${actualImportPath}`);
      mixinImports.set(localName, actualImportPath);
      break; // Only take the first identifier for default imports
    }

    // Also look for named imports
    const namedImports = importClause.findAll({ rule: { kind: 'named_imports' } });
    for (const namedImportNode of namedImports) {
      const importSpecifiers = namedImportNode.findAll({ rule: { kind: 'import_specifier' } });

      for (const specifier of importSpecifiers) {
        const nameNode = specifier.field('name');
        const aliasNode = specifier.field('alias');

        if (!nameNode) continue;

        const originalName = nameNode.text();
        const localName = aliasNode ? aliasNode.text() : originalName;

        debugLog(options, `Found named mixin import: ${originalName} as ${localName} from ${actualImportPath}`);
        mixinImports.set(localName, actualImportPath);
      }
    }
  }

  return mixinImports;
}

/**
 * Parse decorator arguments from a decorator node
 */
export function parseDecoratorArguments(decorator: SgNode): string[] {
  const args: string[] = [];

  // Find the arguments list in the decorator
  const argumentsList = decorator.find({ rule: { kind: 'arguments' } });
  if (!argumentsList) return args;

  // Get all argument nodes
  const argumentNodes = argumentsList
    .children()
    .filter((child) => child.kind() !== '(' && child.kind() !== ')' && child.kind() !== ',');

  for (const arg of argumentNodes) {
    args.push(arg.text());
  }

  return args;
}

/**
 * Parse decorator arguments from a decorator node, returning both text and AST nodes
 */
export function parseDecoratorArgumentsWithNodes(decorator: SgNode): { text: string[]; nodes: SgNode[] } {
  const text: string[] = [];
  const nodes: SgNode[] = [];

  // Find the arguments list in the decorator
  const argumentsList = decorator.find({ rule: { kind: 'arguments' } });
  if (!argumentsList) return { text, nodes };

  // Get all argument nodes
  const argumentNodes = argumentsList
    .children()
    .filter((child) => child.kind() !== '(' && child.kind() !== ')' && child.kind() !== ',');

  for (const arg of argumentNodes) {
    text.push(arg.text());
    nodes.push(arg);
  }

  return { text, nodes };
}

/**
 * Extract kebab-case base name (without extension) from a file path
 */
export function extractBaseName(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
  return fileName.replace(/\.(js|ts)$/, '');
}

/**
 * Extract camelCase name from file path (kebab-case to camelCase conversion)
 */
export function extractCamelCaseName(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
  const baseName = fileName.replace(/\.(js|ts)$/, '');

  // Convert kebab-case to camelCase for valid JavaScript identifier
  // test-plannable -> testPlannable
  return baseName.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

/**
 * Remove surrounding quotes from a string (single or double quotes)
 */
export function removeQuotes(text: string): string {
  return text.replace(/^['"]|['"]$/g, '');
}

/**
 * Convert mixin name to trait name (e.g., "BaseModelMixin" -> "baseModel")
 * When forStringReference is true, returns dasherized format (e.g., "base-model")
 * Handles both mixin names and import paths
 */
export function mixinNameToTraitName(mixinNameOrPath: string, forStringReference = false): string {
  let traitName = mixinNameOrPath;

  // If this looks like a file path, extract the base name
  if (traitName.includes('/') || traitName.includes('\\')) {
    const fileName = traitName.split('/').pop() || traitName.split('\\').pop() || traitName;
    traitName = fileName.replace(/\.(js|ts)$/, '');

    // Convert kebab-case file name to PascalCase
    traitName = traitName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  if (traitName.endsWith('Mixin')) {
    traitName = traitName.slice(0, -5); // Remove 'Mixin' suffix
  }

  if (forStringReference) {
    // Convert PascalCase to kebab-case for string references
    return traitName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, ''); // Remove leading dash if present
  }

  // Convert PascalCase to camelCase for const names
  const baseName = traitName.charAt(0).toLowerCase() + traitName.slice(1);
  return baseName;
}

/**
 * Properly indent code while preserving existing indentation structure
 */
export function indentCode(code: string, indentLevel = 1): string {
  const indent = '  '.repeat(indentLevel);
  return code
    .split('\n')
    .map((line, index) => {
      if (index === 0) {
        return `${indent}${line}`;
      }
      // Preserve empty lines and existing indentation
      return line ? `${indent}${line}` : line;
    })
    .join('\n');
}

/**
 * Convert kebab-case to PascalCase for model/mixin names
 * user-profile -> UserProfile
 */
export function extractPascalCaseName(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
  const baseName = fileName.replace(/\.(js|ts)$/, '');

  return baseName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Generate extension code in either object or class format
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export function generateExtensionCode(
  extensionName: string,
  extensionProperties: Array<{ name: string; originalKey: string; value: string }>,
  format: 'object' | 'class' = 'object',
  interfaceToExtend?: string,
  isTypeScript = true,
  interfaceImportPath?: string
): string {
  if (format === 'class') {
    // Class format used by model-to-schema transform
    const methods = extensionProperties
      .map((prop) => {
        // For class-based extension code, preserve everything exactly as-is
        // The AST already contains the proper syntax, formatting, and structure
        return indentCode(prop.value);
      })
      .join('\n\n');

    const classCode = `export class ${extensionName} {\n${methods}\n}`;

    // Add interface extension for TypeScript files or JSDoc for JavaScript files
    if (interfaceToExtend) {
      if (isTypeScript) {
        // Add import if interfaceImportPath is provided
        const importStatement = interfaceImportPath
          ? `import type { ${interfaceToExtend} } from '${interfaceImportPath}';\n\n`
          : '';
        // Put interface before class for better visibility
        return `${importStatement}export interface ${extensionName} extends ${interfaceToExtend} {}\n\n${classCode}`;
      }
      // For JavaScript files, don't add JSDoc import here since it's handled by the base class pattern
      return classCode;
    }

    return classCode;
  }
  // Object format used by mixin-to-schema transform
  const properties = extensionProperties
    .map((prop) => {
      const key = prop.originalKey;
      return `  ${key}: ${prop.value}`;
    })
    .join(',\n');

  const objectCode = `export const ${extensionName} = {\n${properties}\n};`;

  // Add interface extension for TypeScript files or JSDoc for JavaScript files
  if (interfaceToExtend) {
    if (isTypeScript) {
      // Add import if interfaceImportPath is provided
      const importStatement = interfaceImportPath
        ? `import type { ${interfaceToExtend} } from '${interfaceImportPath}';\n\n`
        : '';
      // Put interface before object for better visibility
      return `${importStatement}export interface ${extensionName} extends ${interfaceToExtend} {}\n\n${objectCode}`;
    }
    // For JavaScript files, don't add JSDoc import here since it's handled by the base class pattern
    return objectCode;
  }

  return objectCode;
}

/**
 * Shared debug logging utility for transforms
 */
export function debugLog(options: TransformOptions | undefined, ...args: unknown[]): void {
  if (options?.debug) {
    console.log(...args);
  }
}

/**
 * Process imports in source code to resolve relative imports and convert them to appropriate types
 */
function processImports(source: string, filePath: string, baseDir: string, options?: TransformOptions): string {
  try {
    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    const root = ast.root();

    // Find all import statements
    const importStatements = root.findAll({ rule: { kind: 'import_statement' } });

    let processedSource = source;

    for (const importNode of importStatements) {
      const sourceNode = importNode.field('source');
      if (!sourceNode) continue;

      const sourceText = sourceNode.text();
      const cleanSourceText = removeQuotes(sourceText);

      // Process both relative and absolute imports
      let resolvedPath: string | null = null;
      let isRelativeImport = false;

      // Skip processing if this is already a resource import (to avoid double-processing)
      if (options?.resourcesImport && cleanSourceText.startsWith(options.resourcesImport)) {
        debugLog(options, `Skipping already processed resource import: ${cleanSourceText}`);
        continue;
      }

      if (cleanSourceText.startsWith('./') || cleanSourceText.startsWith('../')) {
        // Handle relative imports
        debugLog(options, `Processing relative import: ${cleanSourceText}`);
        isRelativeImport = true;
        resolvedPath = resolveRelativeImport(cleanSourceText, filePath, baseDir, options);
      } else if (isSpecialMixinImport(cleanSourceText, options)) {
        // Handle special cases where model imports are actually mixins (e.g., workflowable)
        debugLog(options, `Processing special mixin import: ${cleanSourceText}`);
        resolvedPath = resolveSpecialMixinImport(cleanSourceText, baseDir, options);
      } else if (isModelImportPath(cleanSourceText, options)) {
        // Handle absolute imports that point to model files
        debugLog(options, `Processing absolute model import: ${cleanSourceText}`);
        resolvedPath = resolveAbsoluteModelImport(cleanSourceText, baseDir, options);
      } else if (isMixinImportPath(cleanSourceText, options)) {
        // Handle absolute imports that point to mixin files
        debugLog(options, `Processing absolute mixin import: ${cleanSourceText}`);
        resolvedPath = resolveAbsoluteMixinImport(cleanSourceText, baseDir, options);
      }

      if (resolvedPath) {
        // Determine what type of import this should be converted to
        const convertedImport = convertImportToAbsolute(
          cleanSourceText,
          resolvedPath,
          baseDir,
          importNode,
          isRelativeImport,
          options
        );

        if (convertedImport) {
          debugLog(options, `Converted import: ${cleanSourceText} -> ${convertedImport}`);

          // Replace the import with the converted import, preserving quote style
          const originalImport = importNode.text();
          // Detect the quote style used in the original import
          const quoteChar = sourceText.includes("'") ? "'" : '"';
          // Replace the path inside the quotes, preserving the quote style
          let newImport = originalImport.replace(
            new RegExp(`(['"])${cleanSourceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`),
            `${quoteChar}${convertedImport}${quoteChar}`
          );

          // If the target is a .schema.types file, convert default imports to named imports
          // But only for TypeScript files (.ts), not JavaScript files (.js)
          if (convertedImport.includes('.schema.types') && filePath.endsWith('.ts')) {
            debugLog(
              options,
              `Found .schema.types import in TypeScript file, converting default to named: ${originalImport}`
            );
            // Convert "import type ModelName from 'path'" to "import type { ModelName } from 'path'"
            newImport = newImport.replace(/import\s+type\s+([A-Z][a-zA-Z0-9]*)\s+from/g, 'import type { $1 } from');
            // Also handle imports without 'type' keyword
            newImport = newImport.replace(/import\s+([A-Z][a-zA-Z0-9]*)\s+from/g, 'import type { $1 } from');
            debugLog(options, `Converted default import to named import: ${newImport}`);
          } else if (convertedImport.includes('.schema.types') && filePath.endsWith('.js')) {
            debugLog(
              options,
              `Found .schema.types import in JavaScript file, skipping TypeScript syntax conversion: ${originalImport}`
            );
            // For JavaScript files, we should not use TypeScript import type syntax
            // The import should remain as a regular import, not converted to named import
          } else {
            debugLog(options, `Not a .schema.types import, skipping conversion: ${convertedImport}`);
          }

          processedSource = processedSource.replace(originalImport, newImport);
        }
      }
    }

    return processedSource;
  } catch (error) {
    debugLog(options, `Error processing imports: ${String(error)}`);
    return source; // Return original source if processing fails
  }
}

/**
 * Convert a resolved file path to an absolute import path
 */
function convertToAbsoluteImportPath(resolvedPath: string, baseDir: string, options?: TransformOptions): string | null {
  try {
    // Make the path relative to the base directory
    const relativePath = resolvedPath.replace(baseDir + '/', '');

    // Remove the file extension
    const pathWithoutExt = relativePath.replace(/\.(js|ts)$/, '');

    // Convert to import path format
    const importPath = pathWithoutExt.startsWith('apps/') ? pathWithoutExt.replace('apps/', '') : pathWithoutExt;

    debugLog(options, `Converted resolved path ${resolvedPath} to import path: ${importPath}`);
    return importPath;
  } catch (error) {
    debugLog(options, `Error converting to absolute import path: ${String(error)}`);
    return null;
  }
}

/**
 * Check if an import path points to a model file based on configuration
 */
function isModelImportPath(importPath: string, options?: TransformOptions): boolean {
  debugLog(options, `Checking if import path is model: ${importPath}`);
  debugLog(options, `Model import source: ${options?.modelImportSource}`);
  debugLog(options, `Additional model sources: ${JSON.stringify(options?.additionalModelSources)}`);

  // Check against configured model import source
  if (options?.modelImportSource && importPath.startsWith(options.modelImportSource)) {
    debugLog(options, `Matched configured model import source: ${options.modelImportSource}`);
    return true;
  }

  // Check against additional model sources from configuration
  if (options?.additionalModelSources && Array.isArray(options.additionalModelSources)) {
    const matched = options.additionalModelSources.some((source) => {
      const matches = importPath.startsWith(source.pattern);
      debugLog(options, `Checking pattern ${source.pattern}: ${matches}`);
      return matches;
    });
    if (matched) {
      debugLog(options, `Matched additional model source`);
      return true;
    }
  }

  debugLog(options, `No model source match found`);
  return false;
}

/**
 * Check if an import path points to a mixin file based on configuration
 */
function isMixinImportPath(importPath: string, options?: TransformOptions): boolean {
  // Check against configured mixin import source
  if (options?.mixinImportSource && importPath.startsWith(options.mixinImportSource)) {
    return true;
  }

  // Check against additional mixin sources from configuration
  if (options?.additionalMixinSources) {
    return options.additionalMixinSources.some((source) => importPath.startsWith(source.pattern));
  }

  return false;
}

/**
 * Check if an import path is a special mixin import (e.g., workflowable from models)
 */
function isSpecialMixinImport(importPath: string, options?: TransformOptions): boolean {
  // Special case: workflowable is imported from models but is actually a mixin
  if (importPath === 'soxhub-client/models/workflowable') {
    return true;
  }

  // Add other special cases here as needed
  return false;
}

/**
 * Resolve a special mixin import path to a file system path
 */
function resolveSpecialMixinImport(importPath: string, baseDir: string, options?: TransformOptions): string | null {
  try {
    // Special case: workflowable from models -> mixins/workflowable
    if (importPath === 'soxhub-client/models/workflowable') {
      const mixinPath = `${baseDir}/apps/client/app/mixins/workflowable.js`;
      debugLog(options, `Resolved special mixin import ${importPath} to: ${mixinPath}`);
      return mixinPath;
    }

    // Add other special cases here as needed
    return null;
  } catch (error) {
    debugLog(options, `Error resolving special mixin import: ${String(error)}`);
    return null;
  }
}

/**
 * Resolve an absolute mixin import path to a file system path
 */
function resolveAbsoluteMixinImport(importPath: string, baseDir: string, options?: TransformOptions): string | null {
  try {
    // Build mixin sources from configuration
    const mixinSources: Array<{ pattern: string; dir: string }> = [];

    // Add configured mixin source
    if (options?.mixinImportSource && options?.mixinSourceDir) {
      mixinSources.push({ pattern: options.mixinImportSource + '/', dir: options.mixinSourceDir });
    }

    // Add additional mixin sources from configuration
    if (options?.additionalMixinSources) {
      mixinSources.push(...options.additionalMixinSources);
    }

    // Find matching mixin source
    const mixinSource = mixinSources.find((source) => importPath.startsWith(source.pattern));
    if (!mixinSource) {
      debugLog(options, `No matching mixin source found for import: ${importPath}`);
      return null;
    }

    // Extract the mixin name from the import path
    // e.g., 'soxhub-client/mixins/permissable' -> 'permissable'
    const mixinName = importPath.replace(mixinSource.pattern, '');

    // Construct the file path (mixinSource.dir is already an absolute path)
    const filePath = `${mixinSource.dir}/${mixinName}.ts`;

    // Check if the file exists
    const { existsSync } = require('fs');
    if (existsSync(filePath)) {
      return filePath;
    }

    // Try .js extension
    const jsFilePath = `${mixinSource.dir}/${mixinName}.js`;
    if (existsSync(jsFilePath)) {
      return jsFilePath;
    }

    debugLog(options, `Mixin file not found for import: ${importPath} (tried ${filePath} and ${jsFilePath})`);
    return null;
  } catch (error) {
    debugLog(options, `Error resolving absolute mixin import: ${String(error)}`);
    return null;
  }
}

/**
 * Resolve an absolute model import path to a file system path
 */
function resolveAbsoluteModelImport(importPath: string, baseDir: string, options?: TransformOptions): string | null {
  try {
    debugLog(options, `Resolving absolute model import: ${importPath} in baseDir: ${baseDir}`);

    // Build model sources from configuration
    const modelSources: Array<{ pattern: string; dir: string }> = [];

    // Add configured model source
    if (options?.modelImportSource && options?.modelSourceDir) {
      modelSources.push({ pattern: options.modelImportSource + '/', dir: options.modelSourceDir });
    }

    // Add additional model sources from configuration
    if (options?.additionalModelSources && Array.isArray(options.additionalModelSources)) {
      modelSources.push(...options.additionalModelSources);
    }

    debugLog(options, `Model sources: ${JSON.stringify(modelSources)}`);

    // Find matching model source
    const modelSource = modelSources.find((source) => importPath.startsWith(source.pattern));
    if (!modelSource) {
      debugLog(options, `No matching model source found for import: ${importPath}`);
      return null;
    }

    debugLog(options, `Found matching model source: ${JSON.stringify(modelSource)}`);

    // Extract the model name from the import path
    // e.g., 'soxhub-client/models/notification-message' -> 'notification-message'
    const modelName = importPath.replace(modelSource.pattern, '');
    debugLog(options, `Extracted model name: ${modelName}`);

    // Construct the file path (modelSource.dir is already an absolute path)
    const filePath = `${modelSource.dir}/${modelName}.ts`;
    debugLog(options, `Trying file path: ${filePath}`);

    // Check if the file exists
    const { existsSync } = require('fs');
    if (existsSync(filePath)) {
      debugLog(options, `Found model file: ${filePath}`);
      return filePath;
    }

    // Try .js extension
    const jsFilePath = `${modelSource.dir}/${modelName}.js`;
    debugLog(options, `Trying JS file path: ${jsFilePath}`);
    if (existsSync(jsFilePath)) {
      debugLog(options, `Found model file: ${jsFilePath}`);
      return jsFilePath;
    }

    debugLog(options, `Model file not found for import: ${importPath} (tried ${filePath} and ${jsFilePath})`);
    return null;
  } catch (error) {
    debugLog(options, `Error resolving absolute model import: ${String(error)}`);
    return null;
  }
}

/**
 * Convert an import to the appropriate absolute import based on what type of file it points to
 */
function convertImportToAbsolute(
  originalImport: string,
  resolvedPath: string,
  baseDir: string,
  importNode: SgNode,
  isRelativeImport: boolean,
  options?: TransformOptions
): string | null {
  try {
    // Check if the resolved file is a model file
    try {
      const { readFileSync } = require('fs');
      const source = readFileSync(resolvedPath, 'utf8');
      if (isModelFile(resolvedPath, source, options)) {
        // Convert model import to resource schema import
        const modelName = extractBaseName(resolvedPath);
        const pascalCaseName = toPascalCase(modelName);
        const resourceImport = transformModelToResourceImport(modelName, pascalCaseName, options);

        // Extract just the import path from the full import statement
        const importPathMatch = resourceImport.match(/from '([^']+)'/);
        if (importPathMatch) {
          debugLog(options, `Converting model import ${originalImport} to resource import: ${importPathMatch[1]}`);
          return importPathMatch[1];
        }
      }
    } catch (fileError) {
      debugLog(options, `Error reading file ${resolvedPath}: ${String(fileError)}`);
    }

    // Check if this is a special mixin import
    if (isSpecialMixinImport(originalImport, options)) {
      // Convert special mixin import to trait import
      const mixinName = extractBaseName(resolvedPath);
      const traitName = mixinNameToTraitName(mixinName, true); // true for dasherized format
      const traitImport = options?.traitsImport
        ? `${options.traitsImport}/${traitName}.schema.types`
        : `../traits/${traitName}.schema.types`;

      debugLog(options, `Converting special mixin import ${originalImport} to trait import: ${traitImport}`);
      return traitImport;
    }

    // Check if the resolved file is a mixin file
    if (isMixinFile(resolvedPath, options)) {
      // Convert mixin import to trait import
      const mixinName = extractBaseName(resolvedPath);
      const traitName = mixinNameToTraitName(mixinName, true); // true for dasherized format
      const traitImport = options?.traitsImport
        ? `${options.traitsImport}/${traitName}.schema.types`
        : `../traits/${traitName}.schema.types`;

      debugLog(options, `Converting mixin import ${originalImport} to trait import: ${traitImport}`);
      return traitImport;
    }

    // For other files, convert to absolute import path
    const absoluteImportPath = convertToAbsoluteImportPath(resolvedPath, baseDir, options);
    return absoluteImportPath;
  } catch (error) {
    debugLog(options, `Error converting import: ${String(error)}`);
    return null;
  }
}

/**
 * Convert a relative import to the appropriate absolute import based on what type of file it points to
 */
function convertRelativeImportToAbsolute(
  originalImport: string,
  resolvedPath: string,
  baseDir: string,
  importNode: SgNode,
  options?: TransformOptions
): string | null {
  try {
    // Check if the resolved file is a model file
    try {
      const { readFileSync } = require('fs');
      const source = readFileSync(resolvedPath, 'utf8');
      if (isModelFile(resolvedPath, source, options)) {
        // Convert model import to resource schema import
        const modelName = extractBaseName(resolvedPath);
        const pascalCaseName = toPascalCase(modelName);
        const resourceImport = transformModelToResourceImport(modelName, pascalCaseName, options);

        // Extract just the import path from the full import statement
        const importPathMatch = resourceImport.match(/from '([^']+)'/);
        if (importPathMatch) {
          debugLog(options, `Converting model import ${originalImport} to resource import: ${importPathMatch[1]}`);
          return importPathMatch[1];
        }
      }
    } catch (fileError) {
      debugLog(options, `Error reading file ${resolvedPath}: ${String(fileError)}`);
    }

    // Check if this is a special mixin import
    if (isSpecialMixinImport(originalImport, options)) {
      // Convert special mixin import to trait import
      const mixinName = extractBaseName(resolvedPath);
      const traitName = mixinNameToTraitName(mixinName, true); // true for dasherized format
      const traitImport = options?.traitsImport
        ? `${options.traitsImport}/${traitName}.schema.types`
        : `../traits/${traitName}.schema.types`;

      debugLog(options, `Converting special mixin import ${originalImport} to trait import: ${traitImport}`);
      return traitImport;
    }

    // Check if the resolved file is a mixin file
    if (isMixinFile(resolvedPath, options)) {
      // Convert mixin import to trait import
      const mixinName = extractBaseName(resolvedPath);
      const traitName = mixinNameToTraitName(mixinName, true); // true for dasherized format
      const traitImport = options?.traitsImport
        ? `${options.traitsImport}/${traitName}.schema.types`
        : `../traits/${traitName}.schema.types`;

      debugLog(options, `Converting mixin import ${originalImport} to trait import: ${traitImport}`);
      return traitImport;
    }

    // For other files, convert to absolute import path
    const absoluteImportPath = convertToAbsoluteImportPath(resolvedPath, baseDir, options);
    return absoluteImportPath;
  } catch (error) {
    debugLog(options, `Error converting relative import: ${String(error)}`);
    return null;
  }
}

/**
 * Check if a file is a mixin file by analyzing its content
 */
function isMixinFile(filePath: string, options?: TransformOptions): boolean {
  try {
    const { readFileSync } = require('fs');
    const source = readFileSync(filePath, 'utf8');

    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    const root = ast.root();

    // Look for Mixin.create patterns or mixin imports
    const mixinSources = ['@ember/object/mixin'];
    const mixinImportLocal = findEmberImportLocalName(root, mixinSources, options, filePath, process.cwd());

    return !!mixinImportLocal;
  } catch (error) {
    debugLog(options, `Error checking if file is mixin: ${String(error)}`);
    return false;
  }
}

/**
 * Create extension artifact by modifying the original file using AST
 * This preserves all imports, comments, and structure while replacing the class/export
 */
export function createExtensionFromOriginalFile(
  filePath: string,
  source: string,
  baseName: string,
  extensionName: string,
  extensionProperties: Array<{ name: string; originalKey: string; value: string }>,
  defaultExportNode: SgNode | null,
  options?: TransformOptions,
  interfaceToExtend?: string,
  interfaceImportPath?: string
): TransformArtifact | null {
  if (extensionProperties.length === 0) {
    return null;
  }

  try {
    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    const root = ast.root();

    debugLog(options, `Creating extension from ${filePath} with ${extensionProperties.length} properties`);

    // Find the class declaration (for models) or mixin create call (for mixins)
    const classDeclaration = root.find({ rule: { kind: 'class_declaration' } });
    const mixinCreateCall = root.find({ rule: { kind: 'call_expression' } });

    if (!classDeclaration && !mixinCreateCall) {
      debugLog(options, 'No class declaration or mixin create call found for extension generation');
      return null;
    }

    const isMixin = !classDeclaration && mixinCreateCall;
    debugLog(options, `Extension generation for ${isMixin ? 'mixin' : 'model'} file`);

    // For mixin files, we can proceed without a class declaration

    // Check if we need class syntax (decorators, getters, setters, async methods)
    const needsClassSyntax = extensionProperties.some((prop) => {
      const value = prop.value.trim();
      return value.includes('@') || value.includes('get ') || value.includes('set ') || value.includes('async ');
    });

    // Generate the extension class/object
    const isTypeScript = filePath.endsWith('.ts');
    const extensionCode = generateExtensionCode(
      extensionName,
      extensionProperties,
      needsClassSyntax ? 'class' : 'object',
      interfaceToExtend,
      isTypeScript,
      interfaceImportPath
    );

    // Use a simpler approach: remove the main class and append extension code
    let modifiedSource = source;

    // The main class will be handled in the export processing loop below

    // Remove all export statements except the default export, but preserve their content
    const allExports = root.findAll({ rule: { kind: 'export_statement' } });
    debugLog(options, `Found ${allExports.length} export statements to process`);
    for (const exportNode of allExports) {
      const exportText = exportNode.text();
      debugLog(options, `Processing export: ${exportText.substring(0, 100)}...`);

      // Check if this is the default export (the main model class)
      const isDefaultExport = exportText.includes('export default');
      if (isDefaultExport) {
        debugLog(options, `Removing default export (main model class)`);
        modifiedSource = modifiedSource.replace(exportText, '');
        continue;
      }

      // For non-default exports, remove the export keyword but keep the content
      // Simply replace "export " with empty string
      const contentWithoutExport = exportText.replace(/^export\s+/, '');
      debugLog(options, `Removing export keyword, keeping content: ${contentWithoutExport.substring(0, 50)}...`);
      modifiedSource = modifiedSource.replace(exportText, contentWithoutExport);
    }

    // Process imports to resolve relative imports to absolute imports
    const baseDir = process.cwd();
    debugLog(options, `Processing imports for extension file: ${filePath}`);
    modifiedSource = processImports(modifiedSource, filePath, baseDir, options);

    // Clean up extra whitespace and add the extension code
    modifiedSource = modifiedSource.trim() + '\n\n' + extensionCode;

    // Clean up any stray export keywords
    modifiedSource = modifiedSource.replace(/export\s+default\s*$/gm, '');
    modifiedSource = modifiedSource.replace(/export\s*$/gm, '');

    debugLog(options, `Generated extension code (first 200 chars): ${modifiedSource.substring(0, 200)}...`);
    debugLog(options, `Extension code to add: ${extensionCode.substring(0, 200)}...`);

    // Determine the file extension from the original file
    const originalExt = filePath.endsWith('.ts') ? '.ts' : '.js';

    return {
      type: 'extension',
      name: extensionName,
      code: modifiedSource,
      suggestedFileName: `${baseName}${originalExt}`,
    };
  } catch (error) {
    errorLog(options, `Error creating extension from original file: ${String(error)}`);
    return null;
  }
}

/**
 * Shared error logging utility for transforms
 */
export function errorLog(options: TransformOptions | undefined, ...args: unknown[]): void {
  if (options?.verbose) {
    console.error(...args);
  }
}

/**
 * Map EmberData decorator names to WarpDrive field kinds
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export function getFieldKindFromDecorator(decoratorName: string): string {
  switch (decoratorName) {
    case 'hasMany':
      return 'hasMany';
    case 'belongsTo':
      return 'belongsTo';
    case 'attr':
      return 'attribute';
    default:
      return 'field'; // fallback
  }
}

/**
 * Detect the predominant quote style in a source file
 */
export function detectQuoteStyle(source: string): 'single' | 'double' {
  // Count occurrences of single and double quotes in import/export statements
  const singleQuoteMatches = source.match(/import\s+.*?from\s+'[^']+'/g) || [];
  const doubleQuoteMatches = source.match(/import\s+.*?from\s+"[^"]+"/g) || [];

  // Default to single quotes if more single quotes are found (or equal)
  return singleQuoteMatches.length >= doubleQuoteMatches.length ? 'single' : 'double';
}

/**
 * Generate an export statement with a JSON object
 * Shared pattern used by both model-to-schema and mixin-to-schema transforms
 */
export function generateExportStatement(
  exportName: string,
  jsonObject: Record<string, unknown>,
  useSingleQuotes = false
): string {
  // JSON.stringify handles quoting correctly - strings are quoted, booleans/numbers are not
  let jsonString = JSON.stringify(jsonObject, null, 2);

  // Convert all double quotes to single quotes if using single quotes
  if (useSingleQuotes) {
    // Replace all double quotes with single quotes, but be careful with escaped quotes
    jsonString = jsonString.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, "'$1'");
  }

  return `export const ${exportName} = ${jsonString};`;
}

/**
 * Common transform wrapper that handles AST parsing, debug logging, and error handling
 */
export function withTransformWrapper<T>(
  filePath: string,
  source: string,
  options: TransformOptions,
  transformName: string,
  transformFn: (root: SgNode, source: string, filePath: string, options: TransformOptions) => T
): T | string {
  debugLog(options, `Starting ${transformName} transform for ${filePath} with debug enabled`);

  try {
    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    const root = ast.root();

    return transformFn(root, source, filePath, options);
  } catch (error) {
    errorLog(options, `Error processing ${filePath}:`, error);
    return source;
  }
}

/**
 * Check if a file is a model file by analyzing its content
 */
export function isModelFile(filePath: string, source: string, options?: TransformOptions): boolean {
  try {
    const lang = getLanguageFromPath(filePath);
    const ast = parse(lang, source);
    const root = ast.root();

    // Look for a default export that extends a model
    const defaultExportNode = findDefaultExport(root, options);
    if (!defaultExportNode) {
      return false;
    }

    // Check if it's a class declaration directly in the export
    let classDeclaration = defaultExportNode.find({ rule: { kind: 'class_declaration' } });

    // If no class declaration found in export, check if export references a class by name
    if (!classDeclaration) {
      debugLog(options, 'DEBUG: No class declaration found in export, checking for exported class name');

      // Get the exported identifier name
      const exportedIdentifier = getExportedIdentifier(defaultExportNode, options);
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
        }
      }
    }

    if (!classDeclaration) {
      return false;
    }

    // Check if it has a heritage clause (extends)
    const heritageClause = classDeclaration.find({ rule: { kind: 'class_heritage' } });
    if (!heritageClause) {
      return false;
    }

    const extendsText = heritageClause.text();

    // Check for common model patterns
    const modelPatterns = ['BaseModel', 'Model', '.extend(', 'BaseModelMixin', 'Permissable'];

    return modelPatterns.some((pattern) => extendsText.includes(pattern));
  } catch (error) {
    debugLog(options, `Error checking if file is model: ${String(error)}`);
    return false;
  }
}

/**
 * Resolve relative import path to absolute file path
 */
export function resolveRelativeImport(importPath: string, fromFile: string, baseDir: string): string | null {
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return null;
  }

  try {
    const { dirname, resolve } = require('path');
    const { existsSync } = require('fs');

    const fromDir = dirname(fromFile);
    const resolvedPath = resolve(fromDir, importPath);

    // Try different extensions
    for (const ext of ['.js', '.ts']) {
      const fullPath = resolvedPath + ext;
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Try index files
    for (const ext of ['.js', '.ts']) {
      const indexPath = resolve(resolvedPath, 'index' + ext);
      if (existsSync(indexPath)) {
        return indexPath;
      }
    }
  } catch (error) {
    debugLog(undefined, `Error resolving relative import: ${String(error)}`);
  }

  return null;
}

/**
 * Generic function to find Ember import local names (works for both Model and Mixin)
 * Now also handles relative imports that point to model files
 */
export function findEmberImportLocalName(
  root: SgNode,
  expectedSources: string[],
  options?: TransformOptions,
  fromFile?: string,
  baseDir?: string
): string | null {
  debugLog(options, `Looking for imports from sources:`, expectedSources);

  const importStatements = root.findAll({ rule: { kind: 'import_statement' } });

  for (const importNode of importStatements) {
    const source = importNode.field('source');
    if (!source) continue;

    const sourceText = source.text();
    const cleanSourceText = removeQuotes(sourceText);

    // Check if this is a direct match with expected sources
    if (expectedSources.includes(cleanSourceText)) {
      const importClause = importNode.children().find((child) => child.kind() === 'import_clause');
      if (!importClause) {
        debugLog(options, 'No import clause found in children');
        continue;
      }

      debugLog(options, `Import clause kind: ${importClause.kind()}, text: ${importClause.text()}`);

      // For mixed imports like "import Model, { attr } from '@ember-data/model'",
      // we need to find the default import which comes before the named imports
      const identifiers = importClause.findAll({ rule: { kind: 'identifier' } });

      debugLog(options, `Found ${identifiers.length} identifiers in import clause`);
      for (const id of identifiers) {
        debugLog(options, `Identifier: ${id.text()}`);
      }

      // The first identifier should be the default import
      if (identifiers.length > 0) {
        const defaultImport = identifiers[0];
        if (defaultImport) {
          const localName = defaultImport.text();
          debugLog(options, `Found import with local name: ${localName}`);
          return localName;
        }
      }
    }

    // Check if this is a relative import that points to a model file
    if (fromFile && baseDir && (cleanSourceText.startsWith('./') || cleanSourceText.startsWith('../'))) {
      const resolvedPath = resolveRelativeImport(cleanSourceText, fromFile, baseDir);
      if (resolvedPath) {
        try {
          const { readFileSync } = require('fs');
          const source = readFileSync(resolvedPath, 'utf8');

          if (isModelFile(resolvedPath, source, options)) {
            debugLog(options, `Found relative import pointing to model file: ${cleanSourceText} -> ${resolvedPath}`);

            const importClause = importNode.children().find((child) => child.kind() === 'import_clause');
            if (importClause) {
              const identifiers = importClause.findAll({ rule: { kind: 'identifier' } });
              if (identifiers.length > 0) {
                const defaultImport = identifiers[0];
                if (defaultImport) {
                  const localName = defaultImport.text();
                  debugLog(options, `Found relative model import with local name: ${localName}`);
                  return localName;
                }
              }
            }
          }
        } catch (error) {
          debugLog(options, `Error reading resolved file ${resolvedPath}: ${String(error)}`);
        }
      }
    }
  }

  debugLog(options, `No valid import found for sources: ${expectedSources.join(', ')}`);
  return null;
}

/**
 * Internal function to parse object properties from an AST object node
 * Handles proper type conversion for all JavaScript value types
 */
function parseObjectPropertiesFromNode(objectNode: SgNode): Record<string, unknown> {
  const optionsObj: Record<string, unknown> = {};
  const properties = objectNode.children().filter((child) => child.kind() === 'pair');

  for (const property of properties) {
    const keyNode = property.field('key');
    const valueNode = property.field('value');
    if (!keyNode || !valueNode) continue;

    const key = keyNode.text();
    // Remove quotes from key if present
    const cleanKey =
      key.startsWith('"') && key.endsWith('"')
        ? key.slice(1, -1)
        : key.startsWith("'") && key.endsWith("'")
          ? key.slice(1, -1)
          : key;

    // Extract the value based on its type
    let value: unknown;
    if (valueNode.kind() === 'string') {
      value = valueNode.text().slice(1, -1); // Remove quotes
    } else if (valueNode.kind() === 'true') {
      value = true;
    } else if (valueNode.kind() === 'false') {
      value = false;
    } else if (valueNode.kind() === 'number') {
      value = parseFloat(valueNode.text());
    } else if (valueNode.kind() === 'null') {
      value = null;
    } else if (valueNode.kind() === 'undefined') {
      value = undefined;
    } else {
      // For other types (like identifiers, member expressions), use the text representation
      value = valueNode.text();
    }

    optionsObj[cleanKey] = value;
  }

  return optionsObj;
}

/**
 * Parse an object literal from an AST node directly
 * This is the preferred method as it avoids text conversion overhead
 */
export function parseObjectLiteralFromNode(objectNode: SgNode): Record<string, unknown> {
  try {
    return parseObjectPropertiesFromNode(objectNode);
  } catch (_error) {
    // Return empty object if parsing fails
    return {};
  }
}

/**
 * Parse an object literal string using AST parsing for robust extraction
 * This is the single parser used throughout the codebase
 */
export function parseObjectLiteral(objectText: string): Record<string, unknown> {
  try {
    // Determine language based on the object text content
    const ast = parse(Lang.Ts, objectText);
    const root = ast.root();

    // Find the object literal
    const objectLiteral = root.find({ rule: { kind: 'object' } });
    if (!objectLiteral) {
      return {};
    }

    return parseObjectPropertiesFromNode(objectLiteral);
  } catch (_error) {
    // Return empty object if parsing fails
    return {};
  }
}

/**
 * Find all export statements
 */
export function findExportStatements(root: SgNode, options?: TransformOptions) {
  const exportStatements = root.findAll({ rule: { kind: 'export_statement' } });

  debugLog(options, `Found ${exportStatements.length} export statements`);
  for (const exportStatement of exportStatements) {
    debugLog(options, `Export statement: ${exportStatement.text().substring(0, 100)}...`);
  }

  return exportStatements;
}

/**
 * Find the default export statement in an AST
 */
export function findDefaultExport(root: SgNode, options?: TransformOptions): SgNode | null {
  const exportStatements = findExportStatements(root, options);

  for (const exportStatement of exportStatements) {
    const exportText = exportStatement.text();
    if (exportText.startsWith('export default')) {
      debugLog(options, 'Found default export');
      return exportStatement;
    }
  }

  debugLog(options, 'No default export found');

  return null;
}

/**
 * Create extension artifact if extension properties exist
 * Shared utility for consistent extension artifact generation
 */
export function createExtensionArtifact(
  baseName: string,
  entityName: string,
  extensionProperties: Array<{ name: string; originalKey: string; value: string }>,
  extensionFormat: 'class' | 'object',
  fileExtension?: string
): TransformArtifact | null {
  if (extensionProperties.length === 0) {
    return null;
  }

  const extensionName = `${entityName}Extension`;
  const extensionCode = generateExtensionCode(extensionName, extensionProperties, extensionFormat);

  return {
    type: 'extension',
    name: extensionName,
    code: extensionCode,
    suggestedFileName: `${baseName}${fileExtension || '.ts'}`,
  };
}

/**
 * Create extension and type artifacts for properties with TypeScript types
 */
export function createExtensionArtifactWithTypes(
  baseName: string,
  entityName: string,
  extensionProperties: PropertyInfo[],
  extensionFormat: 'class' | 'object',
  fileExtension?: string
): { extensionArtifact: TransformArtifact | null; typeArtifact: TransformArtifact | null } {
  if (extensionProperties.length === 0) {
    return { extensionArtifact: null, typeArtifact: null };
  }

  const extensionName = entityName.endsWith('Extension') ? entityName : `${entityName}Extension`;

  // Create the extension artifact (JavaScript code)
  const extensionCode = generateExtensionCode(extensionName, extensionProperties, extensionFormat);
  const extensionArtifact: TransformArtifact = {
    type: 'extension',
    name: extensionName,
    code: extensionCode,
    suggestedFileName: `${baseName}${fileExtension || '.ts'}`,
  };

  // Create the type artifact (TypeScript interface)
  const hasTypes = extensionProperties.some((prop) => prop.typeInfo?.type);
  if (hasTypes) {
    // Transform PropertyInfo to the format expected by createTypeArtifact
    const typeProperties = extensionProperties
      .filter((prop): prop is PropertyInfo & { typeInfo: ExtractedType } => Boolean(prop.typeInfo?.type))
      .map((prop) => ({
        name: prop.name,
        type: prop.typeInfo.type,
        readonly: prop.typeInfo.readonly,
        optional: prop.typeInfo.optional,
        // comment field is optional and not provided by ExtractedType
      }));

    const typeArtifact = createTypeArtifact(baseName, `${extensionName}Signature`, typeProperties, 'extension');
    return { extensionArtifact, typeArtifact };
  }

  return { extensionArtifact, typeArtifact: null };
}

/**
 * Extract TypeScript type annotation from a property declaration
 */
export function extractTypeFromDeclaration(propertyNode: SgNode, options?: TransformOptions): ExtractedType | null {
  try {
    // Look for type annotation in the property declaration
    const typeAnnotation = propertyNode.find({ rule: { kind: 'type_annotation' } });
    if (!typeAnnotation) {
      debugLog(options, 'No type annotation found for property');
      return null;
    }

    // Extract the type from the annotation
    const typeNode = typeAnnotation.children().find((child) => child.kind() !== ':');
    if (!typeNode) {
      debugLog(options, 'No type node found in type annotation');
      return null;
    }

    const typeText = typeNode.text();
    debugLog(options, `Extracted type: ${typeText}`);

    // Check for readonly modifier
    const readonly = propertyNode.text().includes('readonly ');

    // Check for optional modifier
    const optional = propertyNode.text().includes('?:');

    // Extract import dependencies from the type
    const imports = extractImportsFromType(typeText);

    return {
      type: typeText,
      readonly,
      optional,
      imports: imports.length > 0 ? imports : undefined,
    };
  } catch (error) {
    debugLog(options, `Error extracting type: ${String(error)}`);
    return null;
  }
}

/**
 * Extract TypeScript type from an EmberData decorator based on the decorator type and AST nodes
 */
export function extractTypeFromDecoratorWithNodes(
  decoratorType: string,
  args: { text: string[]; nodes: SgNode[] },
  options?: TransformOptions
): ExtractedType | null {
  try {
    switch (decoratorType) {
      case 'attr': {
        const attrType = args.text[0] ? removeQuotes(args.text[0]) : 'unknown';
        const optionsNode = args.nodes[1];
        let hasDefaultValue = false;
        let allowNull = true;

        if (optionsNode && optionsNode.kind() === 'object') {
          try {
            const parsedOptions = parseObjectLiteralFromNode(optionsNode);
            hasDefaultValue = 'defaultValue' in parsedOptions;
            allowNull = parsedOptions.allowNull !== 'false';
          } catch {
            // Ignore parsing errors
          }
        }

        // Map EmberData attribute types to TypeScript types
        const { tsType, imports = [] } = getTypeScriptTypeForAttribute(attrType, hasDefaultValue, allowNull, options);

        return {
          type: tsType,
          imports: imports.length > 0 ? imports : undefined,
        };
      }

      case 'belongsTo': {
        const relatedType = args.text[0] ? removeQuotes(args.text[0]) : 'unknown';
        const optionsNode = args.nodes[1];
        let isAsync = false;

        if (optionsNode && optionsNode.kind() === 'object') {
          try {
            const parsedOptions = parseObjectLiteralFromNode(optionsNode);
            isAsync = parsedOptions.async === 'true';
          } catch {
            // Ignore parsing errors
          }
        }

        const modelName = toPascalCase(relatedType);
        let tsType: string;
        const imports: string[] = [];

        if (isAsync) {
          tsType = `Promise<${modelName} | null>`;
        } else {
          tsType = `${modelName} | null`;
        }

        return {
          type: tsType,
          imports: imports.length > 0 ? imports : undefined,
        };
      }

      case 'hasMany': {
        const relatedType = args.text[0] ? removeQuotes(args.text[0]) : 'unknown';
        const optionsNode = args.nodes[1];
        let isAsync = false;

        if (optionsNode && optionsNode.kind() === 'object') {
          try {
            const parsedOptions = parseObjectLiteralFromNode(optionsNode);
            isAsync = parsedOptions.async === 'true';
          } catch {
            // Ignore parsing errors
          }
        }

        const modelName = toPascalCase(relatedType);
        let tsType: string;
        const imports: string[] = [];

        if (isAsync) {
          tsType = `AsyncHasMany<${modelName}>`;
          imports.push(`type { AsyncHasMany } from '@ember-data/model'`);
        } else {
          tsType = `HasMany<${modelName}>`;
          imports.push(`type { HasMany } from '@ember-data/model'`);
        }

        return {
          type: tsType,
          imports: imports.length > 0 ? imports : undefined,
        };
      }

      default:
        return null;
    }
  } catch (error) {
    debugLog(options, `Error extracting type from decorator: ${String(error)}`);
    return null;
  }
}

/**
 * Extract TypeScript type from an EmberData decorator based on the decorator type and arguments
 */
export function extractTypeFromDecorator(
  decoratorType: string,
  args: string[],
  options?: TransformOptions
): ExtractedType | null {
  try {
    switch (decoratorType) {
      case 'attr': {
        const attrType = args[0] ? removeQuotes(args[0]) : 'unknown';
        const optionsText = args[1];
        let hasDefaultValue = false;
        let allowNull = true;

        if (optionsText) {
          try {
            const parsedOptions = parseObjectLiteral(optionsText);
            hasDefaultValue = 'defaultValue' in parsedOptions;
            allowNull = parsedOptions.allowNull !== 'false';
          } catch {
            // Ignore parsing errors
          }
        }

        // Map EmberData attribute types to TypeScript types
        const { tsType, imports = [] } = getTypeScriptTypeForAttribute(attrType, hasDefaultValue, allowNull, options);

        return {
          type: tsType,
          imports: imports.length > 0 ? imports : undefined,
        };
      }

      case 'belongsTo': {
        const relatedType = args[0] ? removeQuotes(args[0]) : 'unknown';
        const optionsText = args[1];
        let isAsync = false;

        if (optionsText) {
          try {
            const parsedOptions = parseObjectLiteral(optionsText);
            isAsync = parsedOptions.async === 'true';
          } catch {
            // Ignore parsing errors
          }
        }

        const modelName = toPascalCase(relatedType);
        let tsType: string;
        const imports: string[] = [];

        if (isAsync) {
          tsType = `Promise<${modelName} | null>`;
        } else {
          tsType = `${modelName} | null`;
        }

        // Add import for the related model type using resource import transformation
        imports.push(transformModelToResourceImport(relatedType, modelName, options));

        return {
          type: tsType,
          imports,
        };
      }

      case 'hasMany': {
        const relatedType = args[0] ? removeQuotes(args[0]) : 'unknown';
        const optionsText = args[1];
        let isAsync = false;

        if (optionsText) {
          try {
            const parsedOptions = parseObjectLiteral(optionsText);
            isAsync = parsedOptions.async === 'true';
          } catch {
            // Ignore parsing errors
          }
        }

        const modelName = toPascalCase(relatedType);
        let tsType: string;
        const imports: string[] = [];

        if (isAsync) {
          tsType = `AsyncHasMany<${modelName}>`;
          imports.push(`type { AsyncHasMany } from '@ember-data/model'`);
        } else {
          tsType = `HasMany<${modelName}>`;
          imports.push(`type { HasMany } from '@ember-data/model'`);
        }

        // Add import for the related model type using resource import transformation
        imports.push(transformModelToResourceImport(relatedType, modelName, options));

        return {
          type: tsType,
          imports,
        };
      }

      default:
        debugLog(options, `Unknown decorator type for type extraction: ${decoratorType}`);
        return null;
    }
  } catch (error) {
    debugLog(options, `Error extracting type from decorator: ${String(error)}`);
    return null;
  }
}

/**
 * Extract import dependencies from a TypeScript type string
 */
function extractImportsFromType(typeText: string, options?: TransformOptions): string[] {
  const imports: string[] = [];

  // Look for specific types that need imports
  if (typeText.includes('AsyncHasMany') || typeText.includes('HasMany')) {
    imports.push(`type { AsyncHasMany, HasMany } from '@ember-data/model'`);
  }

  return imports;
}

/**
 * Convert kebab-case or snake_case to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
    .replace(/\s+/g, '');
}

/**
 * Generate TypeScript type for a belongsTo field
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export function getTypeScriptTypeForBelongsTo(
  field: { type?: string; options?: Record<string, unknown> },
  options?: TransformOptions
): string {
  if (!field.type) {
    return 'unknown';
  }

  const isAsync = field.options && field.options.async === true;
  const typeName = toPascalCase(field.type);

  if (isAsync) {
    return `Promise<${typeName}>`;
  }

  // For sync belongsTo relationships, assume nullability by default for safety
  return `${typeName} | null`;
}

/**
 * Generate TypeScript type for a hasMany field
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export function getTypeScriptTypeForHasMany(
  field: { type?: string; options?: Record<string, unknown> },
  options?: TransformOptions
): string {
  if (!field.type) {
    return 'unknown';
  }

  const isAsync = field.options && field.options.async === true;
  const typeName = toPascalCase(field.type);

  if (isAsync) {
    return `AsyncHasMany<${typeName}>`;
  }

  return `HasMany<${typeName}>`;
}

/**
 * Interface for schema field information
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export interface SchemaField {
  name: string;
  kind: 'attribute' | 'belongsTo' | 'hasMany';
  type?: string;
  options?: Record<string, unknown>;
}

/**
 * Convert EmberData decorator call to schema field using AST nodes
 * This is the preferred method as it avoids text conversion overhead
 */
export function convertToSchemaFieldWithNodes(
  name: string,
  decoratorType: string,
  args: { text: string[]; nodes: SgNode[] }
): SchemaField | null {
  switch (decoratorType) {
    case 'attr': {
      const type = args.text[0] ? removeQuotes(args.text[0]) : undefined;
      const optionsNode = args.nodes[1];
      let options: Record<string, unknown> = {};

      if (optionsNode && optionsNode.kind() === 'object') {
        options = parseObjectLiteralFromNode(optionsNode);
      }

      return {
        name,
        kind: getFieldKindFromDecorator('attr') as 'attribute',
        type,
        options: Object.keys(options).length > 0 ? options : undefined,
      };
    }
    case 'belongsTo': {
      const type = args.text[0] ? removeQuotes(args.text[0]) : undefined;
      const optionsNode = args.nodes[1];
      let options: Record<string, unknown> = {};

      if (optionsNode && optionsNode.kind() === 'object') {
        options = parseObjectLiteralFromNode(optionsNode);
      }

      return {
        name,
        kind: getFieldKindFromDecorator('belongsTo') as 'belongsTo',
        type,
        options: Object.keys(options).length > 0 ? options : undefined,
      };
    }
    case 'hasMany': {
      const type = args.text[0] ? removeQuotes(args.text[0]) : undefined;
      const optionsNode = args.nodes[1];
      let options: Record<string, unknown> = {};

      if (optionsNode && optionsNode.kind() === 'object') {
        options = parseObjectLiteralFromNode(optionsNode);
      }

      return {
        name,
        kind: getFieldKindFromDecorator('hasMany') as 'hasMany',
        type,
        options: Object.keys(options).length > 0 ? options : undefined,
      };
    }
    default:
      return null;
  }
}

/**
 * Convert EmberData decorator call to schema field
 * Shared utility for processing decorator calls in both transforms
 */
export function convertToSchemaField(name: string, decoratorType: string, args: string[]): SchemaField | null {
  switch (decoratorType) {
    case 'attr': {
      const type = args[0] ? removeQuotes(args[0]) : undefined;
      const optionsText = args[1];
      let options: Record<string, unknown> = {};

      if (optionsText) {
        options = parseObjectLiteral(optionsText);
      }

      return {
        name,
        kind: getFieldKindFromDecorator('attr') as 'attribute',
        type,
        options: Object.keys(options).length > 0 ? options : undefined,
      };
    }
    case 'belongsTo': {
      const type = args[0] ? removeQuotes(args[0]) : undefined;
      const optionsText = args[1];
      let options: Record<string, unknown> = {};

      if (optionsText) {
        options = parseObjectLiteral(optionsText);
      }

      return {
        name,
        kind: getFieldKindFromDecorator('belongsTo') as 'belongsTo',
        type,
        options: Object.keys(options).length > 0 ? options : undefined,
      };
    }
    case 'hasMany': {
      const type = args[0] ? removeQuotes(args[0]) : undefined;
      const optionsText = args[1];
      let options: Record<string, unknown> = {};

      if (optionsText) {
        options = parseObjectLiteral(optionsText);
      }

      return {
        name,
        kind: getFieldKindFromDecorator('hasMany') as 'hasMany',
        type,
        options: Object.keys(options).length > 0 ? options : undefined,
      };
    }
    default:
      return null;
  }
}

/**
 * Convert a SchemaField to the legacy schema field format
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export function schemaFieldToLegacyFormat(field: SchemaField): Record<string, unknown> {
  const schemaField: Record<string, unknown> = {
    kind: field.kind,
    name: field.name,
  };

  if (field.type) {
    schemaField.type = field.type;
  }

  if (field.options && Object.keys(field.options).length > 0) {
    schemaField.options = field.options;
  }

  return schemaField;
}

/**
 * Build the core legacy schema object structure
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export function buildLegacySchemaObject(
  type: string,
  schemaFields: SchemaField[],
  mixinTraits: string[],
  mixinExtensions: string[]
): Record<string, unknown> {
  const legacySchema: Record<string, unknown> = {
    type,
    legacy: true,
    identity: { kind: '@id', name: 'id' },
    fields: schemaFields.map(schemaFieldToLegacyFormat),
  };

  if (mixinTraits.length > 0) {
    legacySchema.traits = mixinTraits;
  }

  if (mixinExtensions.length > 0) {
    legacySchema.objectExtensions = mixinExtensions;
  }

  return legacySchema;
}

/**
 * Generate trait schema code
 * Shared between model-to-schema and mixin-to-schema transforms
 */
export function generateTraitSchemaCode(
  traitName: string,
  traitBaseName: string,
  schemaFields: SchemaField[],
  mixinTraits: string[]
): string {
  const trait: Record<string, unknown> = {
    fields: schemaFields.map(schemaFieldToLegacyFormat),
  };

  if (mixinTraits.length > 0) {
    trait.traits = mixinTraits;
  }

  return generateExportStatement(traitName, trait);
}

/**
 * Extract TypeScript type from a method declaration
 */
export function extractTypeFromMethod(methodNode: SgNode, options?: TransformOptions): ExtractedType | null {
  try {
    // Look for return type annotation
    const returnType = methodNode.find({ rule: { kind: 'type_annotation' } });
    if (returnType) {
      const typeNode = returnType.children().find((child) => child.kind() !== ':');
      if (typeNode) {
        const typeText = typeNode.text();
        const imports = extractImportsFromType(typeText);
        return {
          type: typeText,
          imports: imports.length > 0 ? imports : undefined,
        };
      }
    }

    // If no explicit return type, try to infer from method content
    const methodText = methodNode.text();

    // Check for getters
    if (methodText.includes('get ')) {
      // For getters, we could try to infer the return type, but for now return unknown
      return { type: 'unknown' };
    }

    // Check for async methods
    if (methodText.includes('async ')) {
      return { type: 'Promise<unknown>' };
    }

    // For regular methods without explicit return type
    return { type: 'unknown' };
  } catch (error) {
    debugLog(options, `Error extracting type from method: ${String(error)}`);
    return null;
  }
}

/**
 * Generate JSDoc interface for JavaScript files
 */
export function generateJSDocInterface(
  interfaceName: string,
  properties: Array<{
    name: string;
    type: string;
    readonly?: boolean;
    optional?: boolean;
    comment?: string;
  }>
): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(` * @typedef {Object} ${interfaceName}`);

  for (const prop of properties) {
    const optional = prop.optional ? '?' : '';
    const readonly = prop.readonly ? 'readonly ' : '';
    const comment = prop.comment ? ` - ${prop.comment}` : '';
    lines.push(` * @property {${prop.type}} ${readonly}${prop.name}${optional}${comment}`);
  }

  lines.push(' */');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate TypeScript interface code
 */
export function generateInterfaceCode(
  interfaceName: string,
  properties: Array<{
    name: string;
    type: string;
    readonly?: boolean;
    optional?: boolean;
    comment?: string;
  }>,
  extendsClause?: string,
  imports?: string[]
): string {
  const lines: string[] = [];

  // Add imports
  if (imports && imports.length > 0) {
    imports.forEach((importStatement) => {
      // Check if the import statement already includes the 'import' keyword
      if (importStatement.startsWith('import ')) {
        lines.push(`${importStatement};`);
      } else {
        lines.push(`import ${importStatement};`);
      }
    });
    lines.push('');
  }

  // Add interface declaration
  let interfaceDeclaration = `export interface ${interfaceName}`;
  if (extendsClause) {
    interfaceDeclaration += ` extends ${extendsClause}`;
  }
  interfaceDeclaration += ' {';
  lines.push(interfaceDeclaration);

  // Add properties
  properties.forEach((prop) => {
    if (prop.comment) {
      lines.push(`	/** ${prop.comment} */`);
    }

    const readonly = prop.readonly ? 'readonly ' : '';
    const optional = prop.optional ? '?' : '';

    lines.push(`	${readonly}${prop.name}${optional}: ${prop.type};`);
  });

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Extract existing imports from a TypeScript/JavaScript file
 */
export function extractExistingImports(root: SgNode, options?: TransformOptions): string[] {
  const imports: string[] = [];

  // Find all import statements
  const importDeclarations = root.findAll({ rule: { kind: 'import_statement' } });

  for (const importDecl of importDeclarations) {
    const importText = importDecl.text();
    // Skip empty imports and only include actual import statements
    if (importText.trim() && importText.includes('import')) {
      imports.push(importText);
    }
  }

  debugLog(options, `Extracted ${imports.length} existing imports from original file`);
  return imports;
}

/**
 * Create type artifact for interfaces
 */
export function createTypeArtifact(
  baseName: string,
  interfaceName: string,
  properties: Array<{
    name: string;
    type: string;
    readonly?: boolean;
    optional?: boolean;
    comment?: string;
  }>,
  artifactContext?: 'schema' | 'extension' | 'trait',
  extendsClause?: string,
  imports?: string[],
  fileExtension?: string
): TransformArtifact {
  const code = generateInterfaceCode(interfaceName, properties, extendsClause, imports);

  // Determine the type based on context to help with directory routing
  const typeString = artifactContext ? `${artifactContext}-type` : 'type';

  // Generate filename - use .schema.types for all artifact types for consistency
  const extension = fileExtension || '.ts';
  const fileName =
    artifactContext === 'extension'
      ? `${baseName}${extension}` // Extensions don't need .types suffix
      : `${baseName}.schema.types${extension}`; // Use .schema.types for schemas and traits

  return {
    type: typeString,
    name: interfaceName,
    code,
    suggestedFileName: fileName,
  };
}

/**
 * Look for interface definitions in the same file that might correspond to a mixin
 */
export function findAssociatedInterface(root: SgNode, mixinName: string, options?: TransformOptions): SgNode | null {
  debugLog(options, `Looking for interface associated with mixin: ${mixinName}`);

  // Convert mixin name to potential interface names
  // e.g., baseModelMixin -> BaseModelMixin, BaseModel, BaseModelInterface
  const potentialNames = [
    mixinName.charAt(0).toUpperCase() + mixinName.slice(1), // camelCase to PascalCase
    mixinName.charAt(0).toUpperCase() + mixinName.slice(1).replace(/Mixin$/, ''), // Remove Mixin suffix
    mixinName.charAt(0).toUpperCase() + mixinName.slice(1).replace(/Mixin$/, 'Interface'), // Replace with Interface
  ];

  // Find all interface declarations
  const interfaces = root.findAll({ rule: { kind: 'interface_declaration' } });

  for (const interfaceNode of interfaces) {
    const nameNode = interfaceNode.field('name');
    if (!nameNode) continue;

    const interfaceName = nameNode.text();
    if (potentialNames.includes(interfaceName)) {
      debugLog(options, `Found associated interface: ${interfaceName}`);
      return interfaceNode;
    }
  }

  debugLog(options, 'No associated interface found');
  return null;
}

/**
 * Extract type information from an interface declaration
 */
export function extractTypesFromInterface(
  interfaceNode: SgNode,
  options?: TransformOptions
): Map<string, ExtractedType> {
  const typeMap = new Map<string, ExtractedType>();

  // Find the interface body
  const body = interfaceNode.find({ rule: { kind: 'object_type' } });
  if (!body) {
    debugLog(options, 'No interface body found');
    return typeMap;
  }

  // Find all property signatures in the interface
  const properties = body.findAll({ rule: { kind: 'property_signature' } });

  for (const property of properties) {
    const nameNode = property.field('name');
    const typeAnnotation = property.find({ rule: { kind: 'type_annotation' } });

    if (!nameNode || !typeAnnotation) continue;

    const propertyName = nameNode.text();
    const typeNode = typeAnnotation.children().find((child) => child.kind() !== ':');

    if (!typeNode) continue;

    const typeText = typeNode.text();
    const readonly = property.text().includes('readonly ');
    const optional = property.text().includes('?:');

    typeMap.set(propertyName, {
      type: typeText,
      readonly,
      optional,
      imports: extractImportsFromType(typeText),
    });

    debugLog(options, `Extracted type for ${propertyName}: ${typeText}`);
  }

  return typeMap;
}

/**
 * Look for JSDoc type annotations in object literal properties
 */
export function extractJSDocTypes(propertyNode: SgNode, options?: TransformOptions): ExtractedType | null {
  // Look for JSDoc comments preceding the property
  const siblings = propertyNode.parent()?.children() ?? [];
  const propertyIndex = siblings.indexOf(propertyNode);

  // Check previous siblings for JSDoc comments
  for (let i = propertyIndex - 1; i >= 0; i--) {
    const sibling = siblings[i];
    if (!sibling) continue;

    if (sibling.kind() === 'comment' && sibling.text().includes('/**')) {
      const commentText = sibling.text();

      // Extract @type annotations
      const typeMatch = commentText.match(/@type\s*\{([^}]+)\}/);
      if (typeMatch?.[1]) {
        const typeText = typeMatch[1].trim();
        debugLog(options, `Found JSDoc type: ${typeText}`);

        return {
          type: typeText,
          imports: extractImportsFromType(typeText),
        };
      }
    }

    // Stop at non-whitespace, non-comment content
    if (sibling.kind() !== 'comment' && sibling.text().trim() !== '') {
      break;
    }
  }

  return null;
}

/**
 * Get the identifier being exported in a default export
 */
export function getExportedIdentifier(exportNode: SgNode, options?: TransformOptions): string | null {
  if (options?.debug) {
    debugLog(options, 'Getting exported identifier from export node');
    debugLog(
      options,
      'Export children: ' +
        exportNode
          .children()
          .map((c) => `${c.kind()}: ${c.text()}`)
          .join(', ')
    );
  }

  // Look for an identifier being exported (not a call expression)
  const identifiers = exportNode.children().filter((child) => child.kind() === 'identifier');

  if (options?.debug) {
    debugLog(options, 'Found identifiers: ' + identifiers.map((id) => id.text()).join(', '));
  } // Find the identifier that's not 'default' or 'export'
  for (const identifier of identifiers) {
    const text = identifier.text();
    if (text !== 'default' && text !== 'export') {
      debugLog(options, `Found exported identifier: ${text}`);
      return text;
    }
  }

  debugLog(options, 'No exported identifier found');
  return null;
}
