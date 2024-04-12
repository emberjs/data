import type { API, FileInfo, Options } from 'jscodeshift';

import { addImport, parseExistingImports } from '../utils/imports.js';
import { logger } from '../utils/log.js';
import { IMPORT_INFOS } from './imports.js';
import { transformLegacyStoreMethod } from './legacy-store-method.js';
import { TransformResult } from './result.js';

/**
 * | Result       | How-to                      | Meaning                                            |
 * | :------      | :------                     | :-------                                           |
 * | `errors`     | `throw`                     | we attempted to transform but encountered an error |
 * | `unmodified` | return `string` (unchanged) | we attempted to transform but it was unnecessary   |
 * | `skipped`    | return `undefined`          | we did not attempt to transform                    |
 * | `ok`         | return `string` (changed)   | we successfully transformed                        |
 */
export default function (fileInfo: FileInfo, api: API, options: Options): string | undefined {
  logger.config(options);

  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const existingImports = parseExistingImports(j, root, IMPORT_INFOS);
  const result = new TransformResult();

  for (const importInfo of IMPORT_INFOS) {
    result.merge(transformLegacyStoreMethod(j, root, importInfo, existingImports.get(importInfo)));
  }

  for (const importToAdd of result.importsToAdd) {
    if (existingImports.get(importToAdd)) {
      logger.warn(
        `Attempted to add import that already exists: \`import { ${existingImports.get(importToAdd)?.localName} } from '${importToAdd.sourceValue}'`
      );
    } else {
      addImport(j, root, importToAdd);
    }
  }

  // TODO: Make quote configurable or pull from prettierrc
  return root.toSource({ quote: 'single' });
}
