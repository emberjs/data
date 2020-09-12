'use strict';

const requireEsm = require('esm')(module, { cache: false });
const semver = require('semver');

function deprecationIsResolved(deprecatedSince, compatVersion) {
  return semver.lte(semver.minVersion(deprecatedSince), semver.minVersion(compatVersion));
}

function getDeprecations(compatVersion, isProd) {
  const { default: CURRENT_DEPRECATIONS } = requireEsm('@ember-data/private-build-infra/addon/current-deprecations.ts');
  const flags = {};

  Object.keys(CURRENT_DEPRECATIONS).forEach(flag => {
    const deprecatedSince = CURRENT_DEPRECATIONS[flag];
    let flagState = true; // default to no code-stripping

    // if we are told we are compatible with a version
    // we check if we can strip this flag
    if (compatVersion) {
      // in DEBUG we never strip
      if (isProd) {
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

module.exports = getDeprecations;
