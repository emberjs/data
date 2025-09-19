import type { SgNode } from '@ast-grep/napi';
import { Lang, parse } from '@ast-grep/napi';
import { existsSync } from 'fs';
import { join } from 'path';

import type { ExtractedType, PropertyInfo, TransformArtifact, TransformOptions } from './utils/ast-utils.js';

/**
 * Determines if an AST node represents object method syntax that doesn't need key: value format
 * Handles: methods, getters, setters, async methods, generators, computed properties
 */
function isObjectMethodSyntax(property: SgNode): boolean {
  const propertyKind = property.kind();

  // Method definitions: methodName() { ... }
  if (propertyKind === 'method_definition') {
    return true;
  }

  // Check for getter/setter: get/set propertyName() { ... }
  if (propertyKind === 'pair') {
    const key = property.field('key');
    if (key) {
      const keyText = key.text();
      // Getters and setters
      if (keyText === 'get' || keyText === 'set') {
        return true;
      }
    }

    // Check for async methods: async methodName() { ... }
    const value = property.field('value');
    if (value) {
      const valueKind = value.kind();
      if (valueKind === 'function' || valueKind === 'arrow_function') {
        // Check if preceded by async keyword or if it's a generator function
        const propertyText = property.text();
        if (propertyText.includes('async ') || propertyText.includes('function*') || propertyText.includes('*')) {
          return true;
        }
      }
    }
  }

  // Check for computed property names: [computedKey]: value or [computedKey]() { ... }
  if (propertyKind === 'pair') {
    const key = property.field('key');
    if (key?.kind() === 'computed_property_name') {
      // For computed properties, we need key: value syntax unless it's a method
      const value = property.field('value');
      return value?.kind() === 'function';
    }
  }

  return false;
}
import {
  createExtensionFromOriginalFile,
  createTypeArtifact,
  debugLog,
  DEFAULT_EMBER_DATA_SOURCE,
  DEFAULT_MIXIN_SOURCE,
  extractBaseName,
  extractCamelCaseName,
  extractJSDocTypes,
  extractTypeFromMethod,
  extractTypesFromInterface,
  findAssociatedInterface,
  findDefaultExport,
  findEmberImportLocalName,
  generateExportStatement,
  getEmberDataImports,
  getExportedIdentifier,
  getFieldKindFromDecorator,
  getFileExtension,
  getLanguageFromPath,
  getTypeScriptTypeForAttribute,
  getTypeScriptTypeForBelongsTo,
  getTypeScriptTypeForHasMany,
  toPascalCase,
  withTransformWrapper,
} from './utils/ast-utils.js';

/**
 * Check if a resource type file exists and create a stub if it doesn't
 */
function ensureResourceTypeFileExists(
  modelType: string,
  options: TransformOptions,
  artifacts: TransformArtifact[]
): boolean {
  const pascalCaseType = toPascalCase(modelType);

  // Use resourcesDir if available, otherwise fall back to current directory
  const baseDir = options.resourcesDir || '.';
  const resourceTypeFilePath = join(baseDir, `${modelType}.schema.types.ts`);

  // Check if the file exists
  if (!existsSync(resourceTypeFilePath)) {
    debugLog(options, `Resource type file does not exist: ${resourceTypeFilePath}, creating stub`);

    // Create a stub interface
    const stubCode = generateStubResourceTypeInterface(pascalCaseType);

    // Add the stub as an artifact
    artifacts.push({
      type: 'resource-type-stub',
      name: pascalCaseType,
      code: stubCode,
      suggestedFileName: `${modelType}.schema.types.ts`,
    });

    return true; // Stub was created
  }

  return false; // File exists, no stub needed
}

/**
 * Generate a stub resource type interface
 */
function generateStubResourceTypeInterface(typeName: string): string {
  return `// Stub interface for ${typeName} - generated automatically
// This file will be replaced when the actual resource type is generated

export default interface ${typeName} {
  // TODO: Add actual properties when resource schema is generated
}
`;
}

/**
 * Transform to convert Ember mixins to WarpDrive LegacyTrait patterns
 */
export default function transform(filePath: string, source: string, options: TransformOptions): string {

  return withTransformWrapper(
    filePath,
    source,
    options,
    'mixin-to-schema',
    (root, sourceContent, filePathParam, optionsParam) => {
      // Assume all files passed to this codemod are mixins that need to be converted to schemas
      return handleMixinTransform(root, sourceContent, filePathParam, optionsParam);
    }
  );
}

/**
 * Produce zero, one, or two artifacts for a given mixin file:
 * - Trait artifact when attr/hasMany/belongsTo fields are present
 * - Extension artifact when non-trait properties (methods, computeds) are present
 *
 * This does not modify the original source. The CLI can use this to write
 * files to the requested output directories.
 */
export function toArtifacts(filePath: string, source: string, options: TransformOptions): TransformArtifact[] {

  // Check if this mixin is connected to models (skip if not)
  if (options.modelConnectedMixins && !options.modelConnectedMixins.has(filePath)) {
    debugLog(options, `Mixin ${filePath} is not connected to models, skipping artifact generation`);
    return [];
  }

  const lang = getLanguageFromPath(filePath);

  try {
    const ast = parse(lang, source);
    const root = ast.root();

    // Verify this is an ember mixin file we should consider
    const expectedSources = [DEFAULT_MIXIN_SOURCE];
    const mixinImportLocal = findEmberImportLocalName(root, expectedSources, options, filePath, process.cwd());
    if (!mixinImportLocal) {
      debugLog(options, 'No mixin import found, returning empty artifacts');
      return [];
    }

    debugLog(options, `Found mixin import: ${mixinImportLocal}`);

    // Validate there is a default export referencing Mixin.create(...)
    const defaultExportNode = findDefaultExport(root, options);
    if (!defaultExportNode) {
      debugLog(options, 'No default export found, returning empty artifacts');
      return [];
    }

    debugLog(options, 'Found default export, checking if it uses mixin');

    const isDirect = isDirectMixinCreateExport(defaultExportNode, mixinImportLocal);
    let ok = isDirect;

    debugLog(options, `Direct mixin create export: ${isDirect}`);

    if (!ok) {
      const exportedIdentifier = getExportedIdentifier(defaultExportNode, options);
      if (
        exportedIdentifier &&
        isIdentifierInitializedByMixinCreate(root, exportedIdentifier, mixinImportLocal, options)
      ) {
        ok = true;
      }
    }

    debugLog(options, `Mixin validation passed: ${ok}`);

    if (!ok) {
      debugLog(options, 'Not a valid mixin structure, returning empty artifacts');
      return [];
    }

    // Collect decorators and properties
    const baseName = extractBaseName(filePath); // kebab-case
    const mixinName = extractCamelCaseName(filePath); // camelCase
    const emberDataSources = [options?.emberDataImportSource || DEFAULT_EMBER_DATA_SOURCE];
    const emberDataImports = getEmberDataImports(root, emberDataSources, options);

    debugLog(options, `Processing mixin: ${mixinName} (${baseName})`);

    const { traitFields, extensionProperties, extendedTraits } = extractTraitFields(
      root,
      emberDataImports,
      mixinImportLocal,
      mixinName,
      filePath,
      options
    );

    debugLog(
      options,
      `Extract result: ${traitFields.length} trait fields, ${extensionProperties.length} extension properties, ${extendedTraits.length} extended traits`
    );

    if (traitFields.length === 0 && extensionProperties.length === 0) {
      debugLog(options, 'No trait fields or extension properties found, returning empty artifacts');
      return [];
    }


    const artifacts: TransformArtifact[] = [];
    const fileExtension = getFileExtension(filePath);

    if (traitFields.length > 0) {
      const name = `${mixinName}Trait`;
      const code = generateTraitCode(name, traitFields, extendedTraits);
      artifacts.push({
        type: 'trait',
        name,
        code,
        suggestedFileName: `${baseName}.schema${fileExtension}`,
      });

      // Generate trait type interface
      const traitInterfaceName = `${mixinName.charAt(0).toUpperCase() + mixinName.slice(1)}Trait`;

      // Convert trait fields to TypeScript interface properties
      const traitFieldTypes = traitFields.map((field) => {
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
          readonly: false,
        };
      });

      // Convert extended traits to extends clause format
      const extendsClause =
        extendedTraits.length > 0 ? extendedTraits.map((trait) => `${toPascalCase(trait)}Trait`).join(', ') : undefined;

      // Collect imports needed for the trait type interface
      const imports = new Set<string>();
      const modelTypes = new Set<string>();

      // Collect model types and HasMany imports needed for relationships
      for (const field of traitFields) {
        if (field.kind === 'belongsTo' || field.kind === 'hasMany') {
          if (field.type) {
            modelTypes.add(field.type);
          }

          // Add HasMany type imports for hasMany relationships
          if (field.kind === 'hasMany') {
            if (field.options?.async) {
              imports.add("type { AsyncHasMany } from '@ember-data/model'");
            } else {
              imports.add("type { HasMany } from '@ember-data/model'");
            }
          }
        }
      }

      // Add model type imports
      if (modelTypes.size > 0) {
        // Import each model type from its resource types file
        for (const modelType of modelTypes) {
          const pascalCaseType = toPascalCase(modelType);

          // Check if the resource type file exists and create a stub if it doesn't
          // Only generate stubs if resourcesDir is provided (indicating we're in a real project context)
          if (options.resourcesDir) {
            ensureResourceTypeFileExists(modelType, options, artifacts);
          }

          imports.add(`type { ${pascalCaseType} } from '${options.resourcesImport}/${modelType}.schema.types'`);
        }
      }

      const traitTypeArtifact = createTypeArtifact(
        baseName,
        traitInterfaceName,
        traitFieldTypes,
        'trait',
        extendsClause,
        imports.size > 0 ? Array.from(imports) : undefined,
        '.ts' // Type files should always be .ts regardless of source file extension
      );
      artifacts.push(traitTypeArtifact);
    }

    // Create extension artifact by modifying the original file
    // For mixins, extensions should extend the trait interface
    const traitInterfaceName = `${mixinName.charAt(0).toUpperCase() + mixinName.slice(1)}Trait`;
    const traitImportPath = options?.traitsImport
      ? `${options.traitsImport}/${baseName}.schema.types`
      : `../traits/${baseName}.schema.types`;
    const extensionArtifact = createExtensionFromOriginalFile(
      filePath,
      source,
      baseName,
      `${mixinName}Extension`,
      extensionProperties,
      defaultExportNode,
      options,
      traitInterfaceName,
      traitImportPath
    );

    if (extensionArtifact) {
      artifacts.push(extensionArtifact);
    }

    debugLog(options, `Generated ${artifacts.length} artifacts`);
    return artifacts;
  } catch (error) {
    debugLog(options, `Error processing mixin: ${String(error)}`);
    return [];
  }
}

/**
 * Handle transformation of mixin files to LegacyTraits
 */
function handleMixinTransform(root: SgNode, source: string, filePath: string, options: TransformOptions): string {
  try {

    // Check if this mixin is connected to models (skip if not)
    if (options.modelConnectedMixins && !options.modelConnectedMixins.has(filePath)) {
      debugLog(options, `Mixin ${filePath} is not connected to models, skipping transform`);
      return source;
    }

    // Resolve local identifier used for the Mixin default import
    const mixinSources = [DEFAULT_MIXIN_SOURCE];
    const mixinImportLocal = findEmberImportLocalName(root, mixinSources, options, filePath, process.cwd());
    if (options?.debug) {
      debugLog(options, `Found mixin import local: ${mixinImportLocal}`);
    }
    if (!mixinImportLocal) {
      if (options?.debug) {
        debugLog(options, 'No ember/object/mixin import found; skipping transform');
      }
      // No ember/object/mixin import found; do not transform
      return source;
    }

    // Get the valid EmberData decorator imports for this file
    const emberDataSources = [options?.emberDataImportSource || DEFAULT_EMBER_DATA_SOURCE];
    const emberDataImports = getEmberDataImports(root, emberDataSources, options);
    if (options?.debug) {
      debugLog(options, 'Found EmberData imports:', emberDataImports);
    }

    // Extract the mixin name from the file path
    const mixinName = extractCamelCaseName(filePath);

    // Extract trait values (primarily attributes and relationships) and extension properties
    const { traitFields, extensionProperties, extendedTraits } = extractTraitFields(
      root,
      emberDataImports,
      mixinImportLocal,
      mixinName,
      filePath,
      options
    );
    if (options?.debug) {
      debugLog(
        options,
        `Found ${traitFields.length} trait fields, ${extensionProperties.length} extension properties, and ${extendedTraits.length} extended traits`
      );
    }
    if (traitFields.length === 0 && extensionProperties.length === 0) {
      if (options?.debug) {
        debugLog(options, 'No trait fields or extension properties found; skipping transform');
      }
      return source;
    }

    // Find default export using AST traversal
    const defaultExportNode = findDefaultExport(root, options);
    if (!defaultExportNode) {
      return source;
    }

    // Check if it's a direct Mixin.create() call
    if (isDirectMixinCreateExport(defaultExportNode, mixinImportLocal)) {
      const replacement = generateLegacyTrait(mixinName, traitFields, extensionProperties, extendedTraits);
      const original = defaultExportNode.text();
      return source.replace(original, replacement);
    }

    // Check if it's an identifier that references a Mixin.create() call
    const exportedIdentifier = getExportedIdentifier(defaultExportNode, options);
    if (
      exportedIdentifier &&
      isIdentifierInitializedByMixinCreate(root, exportedIdentifier, mixinImportLocal, options)
    ) {
      const replacement = generateLegacyTrait(mixinName, traitFields, extensionProperties, extendedTraits);
      const original = defaultExportNode.text();
      return source.replace(original, replacement);
    }

    // Nothing to replace
    return source;
  } catch {
    return source;
  }
}

/**
 * Check if a default export is directly calling Mixin.create() or Mixin.createWithMixins()
 */
function isDirectMixinCreateExport(exportNode: SgNode, mixinLocalName: string): boolean {
  // Look for a call expression in the export
  const callExpression = exportNode.find({ rule: { kind: 'call_expression' } });
  if (!callExpression) return false;

  // Check if the function being called is a member expression (e.g., Mixin.create or Mixin.createWithMixins)
  const memberExpression = callExpression.field('function');
  if (!memberExpression || memberExpression.kind() !== 'member_expression') return false;

  // Check if the object is our mixin local name
  const object = memberExpression.field('object');
  if (!object || object.text() !== mixinLocalName) return false;

  // Check if the property is 'create' or 'createWithMixins'
  const property = memberExpression.field('property');
  if (!property) return false;

  const propertyName = property.text();
  return propertyName === 'create' || propertyName === 'createWithMixins';
}

/** Check whether an identifier is initialized by `<localMixin>.create(...)` */
function isIdentifierInitializedByMixinCreate(
  root: SgNode,
  ident: string,
  localMixin: string,
  options?: TransformOptions
): boolean {
  debugLog(options, `Checking if identifier '${ident}' is initialized by '${localMixin}.create()'`);

  // Find all variable declarations (both var and const/let)
  const variableDeclarations = [
    ...root.findAll({ rule: { kind: 'variable_declaration' } }),
    ...root.findAll({ rule: { kind: 'lexical_declaration' } }),
  ];

  debugLog(options, `Found ${variableDeclarations.length} variable declarations`);

  for (const varDecl of variableDeclarations) {
    debugLog(options, `Variable declaration: ${varDecl.text()}`);

    // Get all declarators in this declaration
    const declarators = varDecl.findAll({ rule: { kind: 'variable_declarator' } });

    for (const declarator of declarators) {
      // Check if the name matches our identifier
      const nameNode = declarator.field('name');
      if (!nameNode || nameNode.text() !== ident) continue;

      debugLog(options, `Found matching variable declarator for '${ident}'`);

      // Check if the value is a call expression
      const valueNode = declarator.field('value');
      if (!valueNode || valueNode.kind() !== 'call_expression') {
        debugLog(options, `Value is not a call expression: ${valueNode?.kind()}`);
        continue;
      }

      debugLog(options, `Found call expression: ${valueNode.text()}`);

      // Check if it's calling localMixin.create or localMixin.createWithMixins
      const functionNode = valueNode.field('function');
      if (!functionNode || functionNode.kind() !== 'member_expression') {
        debugLog(options, `Function is not a member expression: ${functionNode?.kind()}`);
        continue;
      }

      const object = functionNode.field('object');
      const property = functionNode.field('property');

      if (!object || !property) {
        debugLog(options, 'Missing object or property in member expression');
        continue;
      }

      debugLog(options, `Member expression: ${object.text()}.${property.text()}`);

      if (object.text() === localMixin && (property.text() === 'create' || property.text() === 'createWithMixins')) {
        debugLog(options, `Found matching ${localMixin}.create() call!`);
        return true;
      }
    }
  }

  debugLog(options, 'No matching Mixin.create() initialization found');

  return false;
}

/**
 * Check if the mixin contains non-trait values (functions, computed properties, etc.)
 * that would need to become extensions rather than traits
 */
/**
 * Type information extracted from AST
 */
/**
 * Extract fields that can become trait fields (attr, hasMany, belongsTo)
 * and extension properties with TypeScript types
 */
function extractTraitFields(
  root: SgNode,
  emberDataImports: Map<string, string>,
  mixinLocalName: string,
  mixinName: string,
  filePath: string,
  options?: TransformOptions
): {
  traitFields: Array<{ name: string; kind: string; type?: string; options?: Record<string, unknown> }>;
  extensionProperties: PropertyInfo[];
  extendedTraits: string[];
} {
  const traitFields: Array<{ name: string; kind: string; type?: string; options?: Record<string, unknown> }> = [];
  const extensionProperties: Array<{ name: string; originalKey: string; value: string; typeInfo?: ExtractedType; isObjectMethod?: boolean }> = [];
  const extendedTraits: string[] = [];

  // Look for associated interface in the same file
  const associatedInterface =
    getLanguageFromPath(filePath) === Lang.TypeScript ? findAssociatedInterface(root, mixinName, options) : null;
  let interfaceTypes = new Map<string, ExtractedType>();

  if (associatedInterface) {
    interfaceTypes = extractTypesFromInterface(associatedInterface, options);
    debugLog(options, `Found ${interfaceTypes.size} types from associated interface`);
  }

  // Find calls like <mixinLocalName>.create({ ... }) or .createWithMixins
  const mixinCreateCalls = root.findAll({ rule: { kind: 'call_expression' } }).filter((call) => {
    const fn = call.field('function');
    if (!fn || fn.kind() !== 'member_expression') return false;
    const object = fn.field('object');
    const property = fn.field('property');
    return (
      object?.text() === mixinLocalName && (property?.text() === 'create' || property?.text() === 'createWithMixins')
    );
  });

  debugLog(options, `Found ${mixinCreateCalls.length} mixin create calls`);

  // Extract extended traits from createWithMixins calls
  for (const call of mixinCreateCalls) {
    const fn = call.field('function');
    if (!fn || fn.kind() !== 'member_expression') continue;

    const property = fn.field('property');
    if (property?.text() === 'createWithMixins') {
      const args = call.field('arguments');
      if (args) {
        // The first arguments are the mixins to extend, the last is the object literal
        const argNodes = args.children();
        if (argNodes.length > 1) {
          // Process all arguments except the last one (which is the object literal)
          for (let i = 0; i < argNodes.length - 1; i++) {
            const arg = argNodes[i];
            if (arg && arg.kind() === 'identifier') {
              const extendedMixinName = arg.text();
              // Convert mixin name to dasherized trait name
              // Remove "Mixin" suffix if present, then convert to dasherized format
              const baseName = extendedMixinName.replace(/Mixin$/, '');
              const traitName = baseName
                .replace(/([A-Z])/g, '-$1')
                .toLowerCase()
                .replace(/^-/, '');
              extendedTraits.push(traitName);
              debugLog(options, `Found extended trait: ${traitName} from mixin ${mixinName}`);
            }
          }
        }
      }
    }
  }

  if (mixinCreateCalls.length === 0) {
    return { traitFields, extensionProperties, extendedTraits };
  }

  // Get the first argument (the object literal) of Mixin.create()
  const mixinCall = mixinCreateCalls[0];
  if (!mixinCall) {
    return { traitFields, extensionProperties, extendedTraits };
  }

  const args = mixinCall.field('arguments');
  if (!args) {
    debugLog(options, 'No arguments found in mixin create call');
    return { traitFields, extensionProperties, extendedTraits };
  }

  // Find the object literal argument
  const objectLiteral = args.children().find((child) => child.kind() === 'object');
  if (!objectLiteral) {
    debugLog(options, 'No object literal found in mixin create arguments');
    return { traitFields, extensionProperties, extendedTraits };
  }

  debugLog(options, `Found object literal with ${objectLiteral.children().length} children`);

  // Get direct properties of the object literal - both pairs and method definitions
  const directProperties = objectLiteral
    .children()
    .filter((child) => child.kind() === 'pair' || child.kind() === 'method_definition');

  debugLog(options, `Found ${directProperties.length} direct properties`);

  for (const property of directProperties) {
    let keyNode: SgNode | null;
    let valueNode: SgNode | null;
    let fieldName: string;
    let originalKey: string;
    let typeInfo: ExtractedType | undefined;

    if (property.kind() === 'method_definition') {
      // Handle method definitions: complexMethod() { ... }
      keyNode = property.field('name');
      valueNode = property; // The entire method definition is the "value"
      fieldName = keyNode?.text() || '';
      originalKey = fieldName; // Method names are always unquoted

      // Try to get type from associated interface first
      if (interfaceTypes.has(fieldName)) {
        typeInfo = interfaceTypes.get(fieldName);
      } else {
        // Extract TypeScript type information from method
        try {
          typeInfo = extractTypeFromMethod(property, options) ?? undefined;
        } catch {
          // Ignore type extraction errors for methods in mixins
        }
      }
    } else {
      // Handle regular property pairs: key: value
      keyNode = property.field('key');
      valueNode = property.field('value');
      originalKey = keyNode?.text() || '';

      // Extract the actual property name (remove quotes if present)
      if (originalKey.startsWith('"') && originalKey.endsWith('"')) {
        fieldName = originalKey.slice(1, -1);
      } else if (originalKey.startsWith("'") && originalKey.endsWith("'")) {
        fieldName = originalKey.slice(1, -1);
      } else {
        fieldName = originalKey;
      }

      // Try to get type from associated interface first
      if (interfaceTypes.has(fieldName)) {
        typeInfo = interfaceTypes.get(fieldName);
      } else {
        // Look for JSDoc type annotations
        typeInfo = extractJSDocTypes(property, options) ?? undefined;
      }
    }

    if (!keyNode || !valueNode || !fieldName) continue;

    debugLog(options, `Processing property: ${fieldName}`);

    // Check if this is an EmberData trait field (only applies to regular pairs)
    if (property.kind() === 'pair' && valueNode.kind() === 'call_expression') {
      const functionNode = valueNode.field('function');
      if (functionNode) {
        const functionName = functionNode.text();
        debugLog(options, `Property ${fieldName} has function call: ${functionName}`);

        // Only process if this function is a properly imported EmberData decorator
        if (emberDataImports.has(functionName)) {
          const originalDecoratorName = emberDataImports.get(functionName);
          if (!originalDecoratorName) continue;

          debugLog(options, `Found EmberData decorator: ${functionName} -> ${originalDecoratorName}`);

          // Map EmberData field types to WarpDrive LegacyTrait field kinds
          const kind = getFieldKindFromDecorator(originalDecoratorName);

          // Extract type and options from the call expression
          const typeAndOptions = extractTypeAndOptionsFromCallExpression(valueNode, options);

          const field: { name: string; kind: string; type?: string; options?: Record<string, unknown> } = {
            name: fieldName,
            kind,
          };

          if (typeAndOptions) {
            field.type = typeAndOptions.type;
            if (Object.keys(typeAndOptions.options).length > 0) {
              field.options = typeAndOptions.options;
            }
          }

          traitFields.push(field);
          continue;
        }
      }
    }

    // If we reach here, it's not a trait field, so add it as an extension property
    // This includes computed properties, methods, service injections, etc.
    debugLog(options, `Adding ${fieldName} as extension property`);
    extensionProperties.push({
      name: fieldName,
      originalKey,
      value: valueNode.text(),
      typeInfo,
      isObjectMethod: isObjectMethodSyntax(property),
    });
  }

  debugLog(
    options,
    `Final results: ${traitFields.length} trait fields, ${extensionProperties.length} extension properties, ${extendedTraits.length} extended traits`
  );
  return { traitFields, extensionProperties, extendedTraits };
} /**
 * Extract mixin name from file path
 */

/**
 * Generate split output for mixed mixins - trait and extension parts
 */
// NOTE: previously we supported generating a split of trait + extension. The
// new behavior only replaces the mixin export and preserves the rest of the file.

/**
 * Generate JSDoc pattern for JavaScript extensions with proper type merging
 */
function generateJavaScriptExtensionJSDoc(
  extensionClassName: string,
  traitInterfaceName: string,
  traitImportPath: string
): string {
  return `// The following is a workaround for the fact that we can't properly do
// declaration merging in .js files. If this is converted to a .ts file,
// we can remove this and just use the declaration merging.
/** @import { ${traitInterfaceName} } from '${traitImportPath}' */
/** @type {{ new(): ${traitInterfaceName} }} */
const Base = class {};`;
}

/**
 * Generate LegacyTrait schema object
 */
function generateLegacyTrait(
  mixinName: string,
  traitFields: Array<{ name: string; kind: string; type?: string; options?: Record<string, unknown> }>,
  extensionProperties: PropertyInfo[],
  extendedTraits: string[] = []
): string {
  const traitName = `${mixinName}Trait`;
  // Convert to dasherized format for the name property
  const traitInternalName = mixinName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, ''); // Remove leading dash if present

  // If there are no trait fields, create an extension object instead
  if (traitFields.length === 0 && extensionProperties.length > 0) {
    const extensionName = `${mixinName}Extension`;

    // Build the object literal manually to avoid JSON.stringify escaping
    const properties = extensionProperties
      .map((prop) => {
        return `  ${prop.originalKey}: ${prop.value}`;
      })
      .join(',\n');

    return `export const ${extensionName} = {\n${properties}\n};`;
  }

  // Otherwise, create a standard LegacyTrait with fields
  const legacyTrait: Record<string, unknown> = {
    name: traitInternalName,
    mode: 'legacy' as const,
    fields: traitFields.map((field) => {
      const result: Record<string, unknown> = { name: field.name, kind: field.kind };
      if (field.type) {
        result.type = field.type;
      }
      if (field.options) {
        result.options = field.options;
      }
      return result;
    }),
  };

  // Add traits property if this trait extends other traits
  if (extendedTraits.length > 0) {
    legacyTrait.traits = extendedTraits;
  }

  // Return only the export block; do not modify imports or other code
  return generateExportStatement(traitName, legacyTrait);
}

/** Generate only the trait code block */
function generateTraitCode(
  traitName: string,
  traitFields: Array<{ name: string; kind: string; type?: string; options?: Record<string, unknown> }>,
  extendedTraits: string[] = []
): string {
  const traitInternalName = traitName.replace(/Trait$/, '');
  // Convert to dasherized format for the name property
  const dasherizedName = traitInternalName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, ''); // Remove leading dash if present

  const legacyTrait: Record<string, unknown> = {
    name: dasherizedName,
    mode: 'legacy',
    fields: traitFields.map((field) => {
      const result: Record<string, unknown> = { name: field.name, kind: field.kind };
      if (field.type) {
        result.type = field.type;
      }
      if (field.options) {
        result.options = field.options;
      }
      return result;
    }),
  };

  // Add traits property if this trait extends other traits
  if (extendedTraits.length > 0) {
    legacyTrait.traits = extendedTraits;
  }

  return generateExportStatement(traitName, legacyTrait);
}

/**
 * Extract type and options from a call expression like hasMany('file', { async: false, inverse: 'fileable' })
 */
function extractTypeAndOptionsFromCallExpression(
  callNode: SgNode,
  options?: TransformOptions
): { type: string; options: Record<string, unknown> } | null {
  debugLog(options, `Extracting options from call expression: ${callNode.text()}`);
  try {
    const args = callNode.field('arguments');
    if (!args) {
      debugLog(options, 'No arguments found in call expression');
      return null;
    }

    const argNodes = args.children();
    debugLog(options, `Found ${argNodes.length} arguments in call expression`);

    // Debug: show all arguments (only in debug mode)
    if (options?.debug) {
      for (let i = 0; i < argNodes.length; i++) {
        const argNode = argNodes[i];
        if (argNode) {
          debugLog(options, `Argument ${i}: kind=${argNode.kind()}, text="${argNode.text()}"`);
        }
      }
    }

    // Extract the type from the first argument (should be a string)
    let type: string | null = null;
    for (const arg of argNodes) {
      if (arg.kind() === 'string') {
        type = arg.text().slice(1, -1); // Remove quotes
        break;
      }
    }

    if (!type) {
      debugLog(options, 'No string type argument found in call expression');
      return null;
    }

    // Find the actual object argument (skip whitespace and other non-content nodes)
    let optionsNode: SgNode | null = null;
    for (const arg of argNodes) {
      if (arg.kind() === 'object') {
        optionsNode = arg;
        break;
      }
    }

    if (!optionsNode) {
      debugLog(options, 'No object argument found in call expression');
      return { type, options: {} };
    }
    debugLog(options, `Second argument kind: ${optionsNode.kind()}`);
    if (optionsNode.kind() !== 'object') {
      debugLog(options, 'Second argument is not an object');
      return null;
    }

    // Parse the object literal to extract key-value pairs
    const optionsObj: Record<string, unknown> = {};
    const properties = optionsNode.children().filter((child) => child.kind() === 'pair');

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
      } else {
        // For other types, just use the text representation
        value = valueNode.text();
      }

      optionsObj[cleanKey] = value;
    }

    debugLog(options, `Extracted type: ${type}, options: ${JSON.stringify(optionsObj)}`);
    return { type, options: optionsObj };
  } catch (error) {
    debugLog(options, `Error extracting options: ${String(error)}`);
    return null;
  }
}
