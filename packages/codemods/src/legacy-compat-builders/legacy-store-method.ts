import type {
  ASTPath,
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

export interface Config extends ImportInfo {
  transformOptions: {
    validate?: (j: JSCodeshift, path: ASTPath<LegacyStoreMethodCallExpression>) => void;
    extractBuilderTypeParams?: (
      j: JSCodeshift,
      path: ASTPath<LegacyStoreMethodCallExpression>
    ) => TSTypeParameterInstantiation | null;
    extractRequestTypeParams?: (
      j: JSCodeshift,
      path: ASTPath<LegacyStoreMethodCallExpression>
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
      // SAFETY: JSCodeshift `find` types aren't as smart as they could be
      validate(j, rawPath as ASTPath<LegacyStoreMethodCallExpression>);
      const builderTypeParameters = extractBuilderTypeParams(j, rawPath as ASTPath<LegacyStoreMethodCallExpression>);
      const requestTypeParameters = extractRequestTypeParams(j, rawPath as ASTPath<LegacyStoreMethodCallExpression>);
      const path = { ...rawPath } as ASTPath<LegacyStoreMethodCallExpression>;

      // Replace with, e.g. store.request(findRecord('post', '1')).content
      // First, change the callee to store.request
      path.value.callee.property.name = 'request';
      path.value.typeParameters = requestTypeParameters;

      // Then, wrap the arguments with the builder expression
      const builderExpression = j.callExpression.from({
        callee: j.identifier(existingImport?.localName ?? config.importedName),
        arguments: path.value.arguments,
      });

      // @ts-expect-error JSCodeshift missing types
      builderExpression.typeParameters = builderTypeParameters;
      path.value.arguments = [builderExpression];

      // Next, wrap the whole expression in a MemberExpression to add `.content`
      const memberExpression = j.memberExpression.from({
        object: path.value,
        property: j.identifier.from({ name: 'content' }),
      });

      // Finally, replace
      j(rawPath).replaceWith(memberExpression);

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

export function singularTypeParam(
  _j: JSCodeshift,
  path: ASTPath<LegacyStoreMethodCallExpression>
): TSTypeParameterInstantiation | null {
  return path.value.typeParameters ?? null;
}

export function arrayTypeParam(
  j: JSCodeshift,
  path: ASTPath<LegacyStoreMethodCallExpression>
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
  path: ASTPath<LegacyStoreMethodCallExpression>,
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
