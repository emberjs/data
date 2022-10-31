'use strict';

module.exports = function debugMacros(config) {
  const requireModule = require('./utilities/require-module');

  const TransformPackagePresence = require.resolve('./transforms/babel-plugin-convert-existence-checks-to-macros');
  const TransformDeprecations = require.resolve('./transforms/babel-plugin-transform-deprecations');
  const TransformDebugLogging = require.resolve('./transforms/babel-plugin-transform-logging');
  const TransformFeatures = require.resolve('./transforms/babel-plugin-transform-features');
  const TransformDebugEnv = require.resolve('./transforms/babel-plugin-transform-debug-env');
  const TransformHasDebugPackage = require.resolve('./transforms/babel-plugin-transform-has-debug-package');

  const ALL_PACKAGES = requireModule('@ember-data/private-build-infra/addon/available-packages.ts');
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
        flags: config.deprecations,
      },
      '@ember-data/deprecation-stripping',
    ],
    [
      TransformDebugLogging,
      {
        source: '@ember-data/private-build-infra/debugging',
        flags: config.debug,
      },
      '@ember-data/debugging',
    ],
    [
      TransformDebugEnv,
      {
        source: '@glimmer/env',
        flags: { DEBUG: true },
      },
      '@ember-data/debugging',
    ],
    [
      TransformHasDebugPackage,
      {
        source: '@ember-data/private-build-infra',
        flags: { HAS_DEBUG_PACKAGE: true },
      },
      '@ember-data/optional-packages-stripping',
    ],
  ];

  return plugins;
};
