import type { API, FileInfo } from 'jscodeshift';

import { addImport, parseExistingImports, safeLocalName } from '../utils/imports.js';
import { CONFIGS } from './config.js';
import type { Config } from './legacy-store-method.js';
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
export default function (fileInfo: FileInfo, api: API, _options: Options): string | undefined {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const { existingImports, knownSpecifierNames } = parseExistingImports(fileInfo, j, root, CONFIGS);
  const safeConfigs = Array.from(CONFIGS).map((config) => {
    const safeConfig: Config = { ...config };

    const existing = existingImports.get(config.importedName);
    if (existing) {
      if (existing.localName && existing.localName !== config.importedName) {
        safeConfig.localName = existing.localName;
      }
    } else {
      const localName = safeLocalName(config.importedName, knownSpecifierNames, 'legacy');
      if (localName && localName !== config.importedName) {
        safeConfig.localName = localName;
      }
    }

    return safeConfig;
  });
  const result = new TransformResult();

  for (const config of safeConfigs) {
    result.merge(transformLegacyStoreMethod(fileInfo, j, root, config));
  }

  for (const importToAdd of result.importsToAdd) {
    if (!existingImports.get(importToAdd.importedName)) {
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
