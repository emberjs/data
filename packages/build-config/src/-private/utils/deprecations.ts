import semver from 'semver';

import * as CURRENT_DEPRECATIONS from '../../deprecation-versions.ts';
type MajorMinor = `${number}.${number}`;
type DeprecationFlag = keyof typeof CURRENT_DEPRECATIONS;

function deprecationIsResolved(deprecatedSince: MajorMinor, compatVersion: MajorMinor) {
  return semver.lte(semver.minVersion(deprecatedSince)!, semver.minVersion(compatVersion)!);
}

const NextMajorVersion = '6.';

function deprecationIsNextMajorCycle(deprecatedSince: MajorMinor) {
  return deprecatedSince.startsWith(NextMajorVersion);
}

export function getDeprecations(
  compatVersion: MajorMinor | null | undefined,
  deprecations?: { [key in DeprecationFlag]?: boolean }
): { [key in DeprecationFlag]: boolean } {
  const flags = {} as Record<DeprecationFlag, boolean>;
  const keys = Object.keys(CURRENT_DEPRECATIONS) as DeprecationFlag[];
  const DISABLE_6X_DEPRECATIONS = deprecations?.DISABLE_6X_DEPRECATIONS ?? true;

  keys.forEach((flag) => {
    const deprecatedSince = CURRENT_DEPRECATIONS[flag];
    const isDeactivatedDeprecationNotice = DISABLE_6X_DEPRECATIONS && deprecationIsNextMajorCycle(deprecatedSince);
    let flagState = true; // default to no code-stripping

    if (!isDeactivatedDeprecationNotice) {
      // if we have a specific flag setting, use it
      if (typeof deprecations?.[flag] === 'boolean') {
        flagState = deprecations?.[flag];
      } else if (compatVersion) {
        // if we are told we are compatible with a version
        // we check if we can strip this flag
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
    }

    // console.log(`${flag}=${flagState} (${deprecatedSince} <= ${compatVersion})`);
    flags[flag] = flagState;
  });

  return flags;
}
