import type {
  ASTPath,
  AwaitExpression,
  CallExpression,
  Collection,
  Identifier,
  JSCodeshift,
  MemberExpression,
  TSTypeParameterInstantiation,
} from 'jscodeshift';

import { TransformError } from '../utils/error.js';
import type { ExistingImport, ImportInfo } from '../utils/imports.js';
import { log } from './log.js';
import { TransformResult } from './result.js';

interface LegacyStoreMethodCallExpression extends CallExpression {
  callee: MemberExpression & {
    object: Identifier;
    property: Identifier;
  };
  typeParameters?: TSTypeParameterInstantiation | null;
}

interface ValidLegacyStoreMethodCallExpressionPath extends ASTPath<LegacyStoreMethodCallExpression> {
  parent: ASTPath<AwaitExpression>;
}

export interface Config extends ImportInfo {
  transformOptions: {
    validate?: (j: JSCodeshift, path: ASTPath<LegacyStoreMethodCallExpression>) => void;
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
  j: JSCodeshift,
  root: Collection,
  config: Config,
  existingImport: ExistingImport | undefined
): TransformResult {
  log.debug('\tTransforming calls:', `store.${config.importedName}`);

  const result = new TransformResult();
  const validate = config.transformOptions.validate ?? (() => {});
  const extractBuilderTypeParams = config.transformOptions.extractBuilderTypeParams ?? (() => null);
  const extractRequestTypeParams = config.transformOptions.extractRequestTypeParams ?? (() => null);

  // Find, e.g., store.findRecord('post', '1')
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'Identifier',
          name: 'store', // FIXME: Hardcode this for now.
        },
        property: {
          type: 'Identifier',
          name: config.importedName,
        },
      },
    })
    .forEach((rawPath) => {
      result.attemptedTransform = true;
      let path: ValidLegacyStoreMethodCallExpressionPath;
      try {
        assertIsValidLegacyStoreMethodCallExpressionPath(j, rawPath);
        validate(j, rawPath);
        path = rawPath;
      } catch (error) {
        if (error instanceof TransformError) {
          // Skip this path but continue to transform the rest of the file
          log.warn(
            `\tCannot transform expression at loc ${rawPath.value.loc?.start.line}:${rawPath.value.loc?.start.column}-${rawPath.value.loc?.end.line}:${rawPath.value.loc?.end.column}`,
            error.message
          );
          return;
        }
        throw error;
      }

      const builderTypeParameters = extractBuilderTypeParams(j, path);
      const requestTypeParameters = extractRequestTypeParams(j, path);

      // Replace with, e.g. store.request(findRecord('post', '1')).content
      // First, change the callee to store.request
      path.value.callee.property.name = 'request';
      path.value.typeParameters = requestTypeParameters;

      // Then, wrap the arguments with the builder expression
      const builderExpression = j.callExpression.from({
        callee: j.identifier(existingImport?.localName ?? config.importedName),
        arguments: path.value.arguments,
      });

      // SAFETY: JSCodeshift types are wrong
      (builderExpression as unknown as { typeParameters: TSTypeParameterInstantiation | null }).typeParameters =
        builderTypeParameters;
      path.value.arguments = [builderExpression];

      if (isRecord(path.parent.parent) && j.VariableDeclarator.check(path.parent.parent.value)) {
        // Replace `const post` with `const { content: post }`
        // Replace `const { id }` with `const { content: { id } }`
        path.parent.parent.value.id = j.objectPattern.from({
          properties: [
            j.objectProperty.from({
              key: j.identifier.from({ name: 'content' }),
              value: path.parent.parent.value.id,
            }),
          ],
        });
      } else {
        // It's not assigned to a variable so we don't need to worry about destructuring
        // Wrap the whole await expression in a MemberExpression to add `.content`
        const memberExpression = j.memberExpression.from({
          object: path.parent.value,
          property: j.identifier.from({ name: 'content' }),
        });

        // Finally, replace
        j(path.parent).replaceWith(memberExpression);
      }

      if (!existingImport) {
        result.importsToAdd.add(config);
      }
    });

  return result;
}

/**
 * @throws {Error} If the last argument is an object with a `preload` key
 */
export function validateForFindRecord(j: JSCodeshift, path: ASTPath<LegacyStoreMethodCallExpression>): void {
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
  if (!isRecord(path.parent) || !j.AwaitExpression.check(path.parent.value)) {
    throw new TransformError(`Cannot transform store.${path.value.callee.property.name} without await keyword.`);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
