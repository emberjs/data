import type {
  ASTPath,
  AwaitExpression,
  CallExpression,
  Collection,
  FileInfo,
  Identifier,
  JSCodeshift,
  MemberExpression,
  TSTypeParameterInstantiation,
  YieldExpression,
} from 'jscodeshift';

import { isRecord } from '../../utils/types.js';
import { TransformError } from '../utils/error.js';
import type { ParsedImportInfo } from '../utils/imports.js';
import type { LegacyStoreMethod } from './config.js';
import { log } from './log.js';
import { TransformResult } from './result.js';

interface LegacyStoreMethodCallExpression extends CallExpression {
  callee: MemberExpression & {
    object:
      | (MemberExpression & {
          property: Identifier; // e.g. 'store'
        })
      | Identifier; // e.g. 'store'
    property: Identifier & {
      name: LegacyStoreMethod | 'request';
    };
  };
  typeParameters?: TSTypeParameterInstantiation | null;
}

interface ValidLegacyStoreMethodCallExpressionPath extends ASTPath<LegacyStoreMethodCallExpression> {
  parent: ASTPath<AwaitExpression> | ASTPath<YieldExpression>;
}

export interface Config {
  transformOptions: {
    validate?: (j: JSCodeshift, path: ValidLegacyStoreMethodCallExpressionPath) => void;
    extractBuilderTypeParams?: (
      j: JSCodeshift,
      path: ValidLegacyStoreMethodCallExpressionPath
    ) => TSTypeParameterInstantiation | null;
    extractRequestTypeParams?: (
      j: JSCodeshift,
      path: ValidLegacyStoreMethodCallExpressionPath
    ) => TSTypeParameterInstantiation | null;
  };
}

/**
 * Transform calls to legacy store methods to use the compat builders.
 * e.g. `store.findRecord('post', '1')` -> `store.request(findRecord('post', '1'))`
 *
 * @throws {Error} if the optional `validate` function throws an error
 */
export function transformLegacyStoreMethod(
  fileInfo: FileInfo,
  j: JSCodeshift,
  root: Collection,
  config: Config,
  importInfo: ParsedImportInfo
): TransformResult {
  log.debug({ filepath: fileInfo.path, message: ['\tTransforming calls:', `store.${importInfo.importedName}`] });

  const result = new TransformResult();
  const validate = config.transformOptions.validate ?? (() => {});
  const extractBuilderTypeParams = config.transformOptions.extractBuilderTypeParams ?? (() => null);
  const extractRequestTypeParams = config.transformOptions.extractRequestTypeParams ?? (() => null);

  // Find, e.g., this.store.findRecord('post', '1') or foo.store.findRecord('post', '1') or store.findRecord('post', '1')
  root.find(j.CallExpression, legacyStoreMethodFinder(importInfo)).forEach((path) => {
    result.attemptedTransform = true;
    try {
      assertIsValidLegacyStoreMethodCallExpressionPath(j, path);
      validate(j, path);
    } catch (error) {
      if (error instanceof TransformError) {
        // Skip this path but continue to transform the rest of the file
        log.warn({
          filepath: fileInfo.path,
          loc: path.value.loc,
          message: error.message,
        });
        return;
      }
      throw error;
    }

    const builderTypeParameters = extractBuilderTypeParams(j, path);
    const requestTypeParameters = extractRequestTypeParams(j, path);

    // Replace with, e.g. store.request(findRecord('post', '1'))
    // First, change the callee to store.request
    path.value.callee.property.name = 'request';
    path.value.typeParameters = requestTypeParameters;

    // Then, wrap the arguments with the builder expression
    const builderExpression = j.callExpression.from({
      callee: j.identifier(importInfo.localName ?? importInfo.importedName),
      arguments: path.value.arguments,
    });

    // SAFETY: JSCodeshift types are wrong
    (builderExpression as unknown as { typeParameters: TSTypeParameterInstantiation | null }).typeParameters =
      builderTypeParameters;
    path.value.arguments = [builderExpression];

    if (isRecord(path.parent.parent)) {
      if (
        j.VariableDeclarator.check(path.parent.parent.value) &&
        (j.Identifier.check(path.parent.parent.value.id) || j.ObjectPattern.check(path.parent.parent.value.id))
      ) {
        // Replace `const post` with `const { content: post }`
        // Replace `const { id }` with `const { content: { id } }`
        const id = path.parent.parent.value.id;
        // Intentionally drop unnecessary type annotation from id, as it causes syntax errors otherwise
        const value = j.Identifier.check(id)
          ? j.identifier.from({ ...id, typeAnnotation: null })
          : j.objectPattern.from({ ...id, typeAnnotation: null });
        path.parent.parent.value.id = j.objectPattern.from({
          properties: [
            j.objectProperty.from({
              key: j.identifier.from({ name: 'content' }),
              value,
            }),
          ],
        });
      } else if (j.ReturnStatement.check(path.parent.parent.value)) {
        // It's not assigned to a variable so we don't need to worry about destructuring
        // but we do need to make sure the value stays the same, so:
        // Wrap the whole await expression in a MemberExpression to add `.content`
        const memberExpression = j.memberExpression.from({
          object: path.parent.value,
          property: j.identifier.from({ name: 'content' }),
        });

        // Finally, replace
        j(path.parent).replaceWith(memberExpression);
      }
    }

    result.importsToAdd.add(importInfo);
  });

  return result;
}

function legacyStoreMethodFinder(importInfo: ParsedImportInfo) {
  return function filter(value: CallExpression): value is LegacyStoreMethodCallExpression {
    return (
      value.callee.type === 'MemberExpression' &&
      value.callee.property.type === 'Identifier' &&
      importInfo.importedName === value.callee.property.name &&
      (value.callee.object.type === 'Identifier' ||
        (value.callee.object.type === 'MemberExpression' && value.callee.object.property.type === 'Identifier'))
    );
  };
}

/**
 * @throws {Error} If the last argument is an object with a `preload` key
 */
export function validateForFindRecord(j: JSCodeshift, path: ValidLegacyStoreMethodCallExpressionPath): void {
  // If the last argument is an object with a `preload` key, throw an error
  const lastArg = path.value.arguments[path.value.arguments.length - 1];
  if (
    j.ObjectExpression.check(lastArg) &&
    lastArg.properties.some(
      (prop) => j.ObjectProperty.check(prop) && j.Identifier.check(prop.key) && prop.key.name === 'preload'
    )
  ) {
    throw new TransformError(
      `Cannot transform store.findRecord with a 'preload' key. This option is not supported by the legacy compat builders.`
    );
  }
}

function assertIsValidLegacyStoreMethodCallExpressionPath(
  j: JSCodeshift,
  path: ASTPath<CallExpression>
): asserts path is ValidLegacyStoreMethodCallExpressionPath {
  // Duplicate logic because JSCodeshift types are stupid
  if (!j.MemberExpression.check(path.value.callee)) {
    throw new Error(`JSCodeshift filter failed. path.value.callee is not a MemberExpression`);
  }
  if (!j.Identifier.check(path.value.callee.property)) {
    throw new Error(`JSCodeshift filter failed. path.value.callee.property is not an Identifier`);
  }
  // Actual logic for our validation
  if (
    !isRecord(path.parent) ||
    !(j.AwaitExpression.check(path.parent.value) || j.YieldExpression.check(path.parent.value))
  ) {
    throw new TransformError(
      `Cannot transform store.${path.value.callee.property.name} without await (or yield) keyword.`
    );
  }
}

export function singularTypeParam(
  _j: JSCodeshift,
  path: ValidLegacyStoreMethodCallExpressionPath
): TSTypeParameterInstantiation | null {
  return path.value.typeParameters ?? null;
}

export function arrayTypeParam(
  j: JSCodeshift,
  path: ValidLegacyStoreMethodCallExpressionPath
): TSTypeParameterInstantiation | null {
  const singular = path.value.typeParameters;
  if (!singular) {
    return null;
  }
  assertLegacyStoreMethodTSTypeParameterInstantiation(path, singular);
  const arrayType = j.tsArrayType.from({
    elementType: singular.params[0],
  });
  return j.tsTypeParameterInstantiation.from({
    ...singular,
    params: [arrayType],
  });
}

interface LegacyStoreMethodTSTypeParameterInstantiation extends TSTypeParameterInstantiation {}

function assertLegacyStoreMethodTSTypeParameterInstantiation(
  path: ValidLegacyStoreMethodCallExpressionPath,
  typeParameters: TSTypeParameterInstantiation
): asserts typeParameters is LegacyStoreMethodTSTypeParameterInstantiation {
  if (typeParameters.params.length !== 1) {
    throw new TransformError(
      `Expected exactly one type parameter for ${path.value.callee.property.name} expression, found ${typeParameters.params.length}`
    );
  }
  if (!['TSTypeReference', 'TSAnyKeyword'].includes(typeParameters.params[0].type)) {
    throw new TransformError(`Expected singular TSTypeReference, found ${typeParameters.type}`);
  }
}
