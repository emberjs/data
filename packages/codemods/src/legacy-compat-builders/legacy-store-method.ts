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

      // Replace with, e.g. store.request(findRecord('post', '1'))

      // Create builder expression with the same args
      const builderExpression = j.callExpression.from({
        callee: j.identifier(existingImport?.localName ?? importInfo.importedName),
        arguments: path.value.arguments,
      });

      // Change the callee to store.request
      const replacementCallee = j.memberExpression.from({
        ...path.value.callee,
        property: j.identifier.from({
          ...path.value.callee.property,
          name: 'request',
        }),
      });

      const replacementExpression = j.callExpression.from({
        ...path.value,
        callee: replacementCallee,
        arguments: [builderExpression],
      });

      j(path).replaceWith(replacementExpression);

      if (!existingImport) {
        result.importsToAdd.add(importInfo);
      }
    });

  return result;
}
