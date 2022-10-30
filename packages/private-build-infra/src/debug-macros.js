'use strict';

module.exports = function debugMacros(app, isProd, config) {
  const requireModule = require('./utilities/require-module');

  const PACKAGES = require('./packages')(app);
  const FEATURES = require('./features')(isProd);
  const DEBUG = require('./debugging')(config.debug, isProd);
  const DEPRECATIONS = require('./deprecations')(config.compatWith, isProd);
  const debugMacrosPath = require.resolve('babel-plugin-debug-macros');
  const ConvertExistenceChecksToMacros = require.resolve(
    './transforms/babel-plugin-convert-existence-checks-to-macros'
  );

  const ALL_PACKAGES = requireModule('@ember-data/private-build-infra/addon/available-packages.ts');
  const MACRO_PACKAGE_FLAGS = Object.assign({}, ALL_PACKAGES.default);
  delete MACRO_PACKAGE_FLAGS['HAS_DEBUG_PACKAGE'];

  const DEBUG_PACKAGE_FLAG = {
    HAS_DEBUG_PACKAGE: PACKAGES.HAS_DEBUG_PACKAGE,
  };

  let plugins = [
    [
      debugMacrosPath,
      {
        flags: [
          {
            source: '@ember-data/canary-features',
            flags: FEATURES,
          },
        ],
      },
      '@ember-data/canary-features-stripping',
    ],
    [
      ConvertExistenceChecksToMacros,
      {
        source: '@ember-data/private-build-infra',
        flags: MACRO_PACKAGE_FLAGS,
      },
    ],
    [
      debugMacrosPath,
      {
        flags: [
          {
            source: '@ember-data/private-build-infra/deprecations',
            flags: DEPRECATIONS,
          },
        ],
      },
      '@ember-data/deprecation-stripping',
    ],
    [
      debugMacrosPath,
      {
        flags: [
          {
            source: '@ember-data/private-build-infra/debugging',
            flags: DEBUG,
          },
        ],
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
