import semver from 'semver';

import * as CURRENT_DEPRECATIONS from '../../virtual/deprecation-versions.ts';
type MajorMinor = `${number}.${number}`;
type DeprecationFlag = keyof typeof CURRENT_DEPRECATIONS;

function deprecationIsResolved(deprecatedSince: MajorMinor, compatVersion: MajorMinor) {
  return semver.lte(semver.minVersion(deprecatedSince)!, semver.minVersion(compatVersion)!);
}

export function getDeprecations(compatVersion: MajorMinor | null | undefined): { [key in DeprecationFlag]: boolean } {
  const flags = {} as Record<DeprecationFlag, boolean>;
  const keys = Object.keys(CURRENT_DEPRECATIONS) as DeprecationFlag[];

  keys.forEach((flag) => {
    const deprecatedSince = CURRENT_DEPRECATIONS[flag];
    let flagState = true; // default to no code-stripping

    // if we are told we are compatible with a version
    // we check if we can strip this flag
    if (compatVersion) {
      const isResolved = deprecationIsResolved(deprecatedSince, compatVersion);
      // if we've resolved, we strip (by setting the flag to false)
      /*
        if (DEPRECATED_FEATURE) {
          // deprecated code path
        } else {
          // if needed a non-deprecated code path
        }
      */
      flagState = !isResolved;
    }

    // console.log(`${flag}=${flagState} (${deprecatedSince} <= ${compatVersion})`);
    flags[flag] = flagState;
  });

  return flags;
}
