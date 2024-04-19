'use strict';

module.exports = function debugMacros(config) {
  const requireModule = require('./utilities/require-module');

  const TransformPackages = require.resolve('./transforms/babel-plugin-transform-packages');
  const TransformDeprecations = require.resolve('./transforms/babel-plugin-transform-deprecations');
  const TransformDebugLogging = require.resolve('./transforms/babel-plugin-transform-logging');
  const TransformFeatures = require.resolve('./transforms/babel-plugin-transform-features');
  const TransformHasDebugPackage = require.resolve('./transforms/babel-plugin-transform-has-debug-package');

  const ALL_PACKAGES = requireModule('@ember-data/private-build-infra/virtual-packages/packages.js');
  const MACRO_PACKAGE_FLAGS = Object.assign({}, ALL_PACKAGES.default);
  delete MACRO_PACKAGE_FLAGS['HAS_DEBUG_PACKAGE'];

  let plugins = [
    [
      TransformFeatures,
      {
        source: '@warp-drive/build-config/canary-features',
        flags: config.features,
      },
      '@warp-drive/build-config/canary-features-stripping',
    ],
    [
      TransformPackages,
      {
        source: '@ember-data/packages',
        flags: MACRO_PACKAGE_FLAGS,
      },
    ],
    [
      TransformDeprecations,
      {
        source: '@warp-drive/build-config/deprecations',
        flags: config.deprecations,
      },
      '@ember-data/deprecation-stripping',
    ],
    [
      TransformDebugLogging,
      {
        source: '@warp-drive/build-config/debugging',
        configKey: 'debug',
        flags: config.debug,
      },
      '@warp-drive/build-config/debugging',
    ],
    [
      TransformDebugLogging,
      {
        source: '@warp-drive/build-config/env',
        configKey: 'env',
        flags: {
          TESTING: true,
          PRODUCTION: true,
          DEBUG: true,
        },
      },
      '@warp-drive/build-config/env',
    ],
    [
      TransformHasDebugPackage,
      {
        source: '@ember-data/packages',
        flags: { HAS_DEBUG_PACKAGE: true },
      },
      '@ember-data/optional-packages-stripping',
    ],
  ];

  return plugins;
};
