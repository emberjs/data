import type { API, FileInfo, Options } from 'jscodeshift';

import { addImport, parseExistingImports } from '../utils/imports.js';
import { CONFIGS } from './config.js';
import { transformLegacyStoreMethod } from './legacy-store-method.js';
import { log } from './log.js';
import { TransformResult } from './result.js';

/**
 * | Result       | How-to                      | Meaning                                            |
 * | :------      | :------                     | :-------                                           |
 * | `errors`     | `throw`                     | we attempted to transform but encountered an error |
 * | `unmodified` | return `string` (unchanged) | we attempted to transform but it was unnecessary   |
 * | `skipped`    | return `undefined`          | we did not attempt to transform                    |
 * | `ok`         | return `string` (changed)   | we successfully transformed                        |
 */
export default function (fileInfo: FileInfo, api: API, _options: Options): string | undefined {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const existingImports = parseExistingImports(j, root, CONFIGS);
  const result = new TransformResult();

  for (const config of CONFIGS) {
    result.merge(transformLegacyStoreMethod(j, root, config, existingImports.get(config)));
  }

  for (const importToAdd of result.importsToAdd) {
    if (existingImports.get(importToAdd)) {
      log.warn(
        `Attempted to add import that already exists: \`import { ${existingImports.get(importToAdd)?.localName} } from '${importToAdd.sourceValue}'`
      );
    } else {
      addImport(j, root, importToAdd);
    }
  }

  // Only run `toSource` if we actually attempted to transform.
  // We need this because recast's handling of comments is really stinky and
  // will cause unnecessary diffs. Don't want to make users deal with those if
  // there was nothing to even transform in the file to begin with.
  if (result.attemptedTransform) {
    // TODO: Make quote configurable or pull from prettierrc
    return root.toSource({ quote: 'single' });
  } else {
    // unmodified
    return fileInfo.source;
  }
}
