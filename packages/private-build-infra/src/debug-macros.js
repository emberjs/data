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
        source: '@ember-data/canary-features',
        flags: config.features,
      },
      '@ember-data/canary-features-stripping',
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
        source: '@ember-data/deprecations',
        flags: config.deprecations,
      },
      '@ember-data/deprecation-stripping',
    ],
    [
      TransformDebugLogging,
      {
        source: '@ember-data/debugging',
        configKey: 'debug',
        flags: config.debug,
      },
      '@ember-data/debugging',
    ],
    [
      TransformDebugLogging,
      {
        source: '@ember-data/env',
        configKey: 'env',
        flags: {
          TESTING: true,
          PRODUCTION: true,
          DEBUG: true,
        },
      },
      '@ember-data/env',
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
