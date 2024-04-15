import type { ASTPath, CallExpression, Collection, Identifier, JSCodeshift, MemberExpression } from 'jscodeshift';

import type { ExistingImport, ImportInfo } from '../utils/imports.js';
import { logger } from '../utils/log.js';
import { TransformResult } from './result.js';

interface LegacyStoreMethodCallExpression extends CallExpression {
  callee: MemberExpression & {
    object: Identifier;
    property: Identifier;
  };
}

/**
 * Transform calls to legacy store methods to use the compat builders.
 * e.g. `store.findRecord('post', '1')` -> `store.request(findRecord('post', '1'))`
 *
 * @throws {Error} If the last argument is an object with a `preload` key
 */
export function transformLegacyStoreMethod(
  j: JSCodeshift,
  root: Collection,
  importInfo: ImportInfo,
  existingImport: ExistingImport | undefined
): TransformResult {
  logger.debug(`transforming ${importInfo.importedName} calls`);

  const result = new TransformResult();

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
          name: importInfo.importedName,
        },
      },
    })
    .forEach((rawPath) => {
      // SAFETY: JSCodeshift `find` types aren't as smart as they could be
      const path = rawPath as ASTPath<LegacyStoreMethodCallExpression>;

      if (importInfo.importedName === 'findRecord') {
        // If the last argument is an object with a `preload` key, throw an error
        const lastArg = path.value.arguments[path.value.arguments.length - 1];
        if (
          j.ObjectExpression.check(lastArg) &&
          lastArg.properties.some(
            (prop) => j.ObjectProperty.check(prop) && j.Identifier.check(prop.key) && prop.key.name === 'preload'
          )
        ) {
          throw new Error(
            `Cannot transform store.findRecord with a 'preload' key. This option is not supported by the legacy compat builders.`
          );
        }
      }

      // Replace with, e.g. store.request(findRecord('post', '1'))
      // const builderExpression = j.callExpression.from({
      //   ...path.value,
      //   callee: j.identifier.from({
      //     name: existingImport?.localName ?? importInfo.importedName,
      //     comments: path.value.callee.comments ?? null,
      //   }),
      // });
      // const storeDotRequestExpression = j.callExpression.from({
      //   callee: j.memberExpression.from({
      //     property: j.identifier.from({
      //       ...path.value.callee.property,
      //       name: 'request',
      //     }),
      //     object: path.value.callee.object,
      //   }),
      //   arguments: [builderExpression],
      // });

      // j(path).replaceWith(storeDotRequestExpression);

      // Replace with, e.g. store.request(findRecord('post', '1'))
      // 1. Change the callee to store.request
      path.value.callee.property.name = 'request';
      // 2. Wrap the arguments with the builder expression
      const builderExpression = j.callExpression.from({
        callee: j.identifier(existingImport?.localName ?? importInfo.importedName),
        arguments: path.value.arguments,
      });
      path.value.arguments = [builderExpression];

      if (!existingImport) {
        result.importsToAdd.add(importInfo);
      }
    });

  return result;
}
