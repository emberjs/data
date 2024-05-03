import type { API, FileInfo } from 'jscodeshift';

import { addImport, parseExistingImports } from '../utils/imports.js';
import { CONFIGS, IMPORT_INFOS } from './config.js';
import { transformLegacyStoreMethod } from './legacy-store-method.js';
import type { Options } from './options.js';
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
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const parsedImportInfos = parseExistingImports(fileInfo, j, root, IMPORT_INFOS);

  const result = new TransformResult();
  for (const parsedImportInfo of parsedImportInfos) {
    const config = CONFIGS.get(parsedImportInfo.importedName);
    if (!config) {
      throw new Error(`could not find config for ${parsedImportInfo.importedName}`);
    }
    result.merge(transformLegacyStoreMethod(fileInfo, j, root, config, parsedImportInfo, options));
  }

  for (const importToAdd of result.importsToAdd) {
    if (!importToAdd.existingImport) {
      addImport(fileInfo, j, root, importToAdd);
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
