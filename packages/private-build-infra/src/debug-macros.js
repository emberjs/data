'use strict';

module.exports = function debugMacros(app, isProd) {
  const requireModule = require('./utilities/require-module');

  const TransformPackagePresence = require.resolve('./transforms/babel-plugin-convert-existence-checks-to-macros');
  const TransformDeprecations = require.resolve('./transforms/babel-plugin-transform-deprecations');
  const TransformDebugLogging = require.resolve('./transforms/babel-plugin-convert-debug-flags-macros');
  const TransformFeatures = require.resolve('./transforms/babel-plugin-transform-features');
  const TransformDebugEnv = require.resolve('./transforms/babel-plugin-transform-debug-env');

  const ALL_PACKAGES = requireModule('@ember-data/private-build-infra/addon/available-packages.ts');
  const DEPRECATIONS = requireModule('@ember-data/private-build-infra/addon/current-deprecations.ts');
  const { default: DEBUG_FEATURES } = requireModule('@ember-data/private-build-infra/addon/debugging.ts');
  const MACRO_PACKAGE_FLAGS = Object.assign({}, ALL_PACKAGES.default);
  delete MACRO_PACKAGE_FLAGS['HAS_DEBUG_PACKAGE'];

  const debugMacrosPath = require.resolve('babel-plugin-debug-macros');
  const PACKAGES = require('./packages')(app);
  const FEATURES = require('./features')(isProd);
  const DEBUG_PACKAGE_FLAG = {
    HAS_DEBUG_PACKAGE: PACKAGES.HAS_DEBUG_PACKAGE,
  };

  let plugins = [
    [
      TransformFeatures,
      {
        source: '@ember-data/canary-features',
        flags: FEATURES,
      },
      '@ember-data/canary-features-stripping',
    ],
    [
      TransformPackagePresence,
      {
        source: '@ember-data/private-build-infra',
        flags: MACRO_PACKAGE_FLAGS,
      },
      '@ember-data/package-stripping',
    ],
    [
      TransformDeprecations,
      {
        source: '@ember-data/private-build-infra/deprecations',
        flags: Object.assign({}, DEPRECATIONS.default),
      },
      '@ember-data/deprecation-stripping',
    ],
    [
      TransformDebugLogging,
      {
        source: '@ember-data/private-build-infra/debugging',
        flags: DEBUG_FEATURES,
      },
      '@ember-data/debugging',
    ],
    [
      TransformDebugEnv,
      {
        source: '@glimmer/env',
        flags: { DEBUG: '' },
      },
      '@ember-data/debugging',
    ],
    [
      debugMacrosPath,
      {
        flags: [
          {
            source: '@ember-data/private-build-infra',
            flags: DEBUG_PACKAGE_FLAG,
          },
        ],
      },
      '@ember-data/optional-packages-stripping',
    ],
  ];

  return plugins;
};
