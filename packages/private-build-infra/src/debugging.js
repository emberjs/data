'use strict';

const requireModule = require('./utilities/require-module');

function getDebugFeatures(debugConfig, isProd) {
  const { default: DEBUG_FEATURES } = requireModule('@ember-data/private-build-infra/addon/debugging.ts');
  const flags = {};

  Object.keys(DEBUG_FEATURES).forEach((flag) => {
    flags[flag] = isProd ? false : debugConfig[flag] || DEBUG_FEATURES[flag];
  });

  return flags;
}

module.exports = getDebugFeatures;
