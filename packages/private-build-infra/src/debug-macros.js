'use strict';

<<<<<<< HEAD
module.exports = function debugMacros(app, isProd, config) {
  const PACKAGES = require('./packages')(app);
||||||| parent of 3667ed7d1 (Use config to determine what to replace, add config to replace all existing package existence checks)
module.exports = function debugMacros(app, isProd, compatVersion) {
  const PACKAGES = require('./packages')(app);
=======
module.exports = function debugMacros(app, isProd, compatVersion) {
>>>>>>> 3667ed7d1 (Use config to determine what to replace, add config to replace all existing package existence checks)
  const FEATURES = require('./features')(isProd);
  const DEBUG = require('./debugging')(config.debug, isProd);
  const DEPRECATIONS = require('./deprecations')(config.compatWith, isProd);
  const debugMacrosPath = require.resolve('babel-plugin-debug-macros');
  const ConvertExistenceChecksToMacros = require.resolve(
    './transforms/babel-plugin-convert-existence-checks-to-macros'
  );

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
<<<<<<< HEAD
<<<<<<< HEAD
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
      ConvertExistenceChecksToMacros,
      {
        HAS_EMBER_DATA_PACKAGE: 'ember-data',
        HAS_STORE_PACKAGE: '@ember-data/store',
        HAS_MODEL_PACKAGE: '@ember-data/model',
        HAS_RECORD_DATA_PACKAGE: '@ember-data/record-data',
        HAS_ADAPTER_PACKAGE: '@ember-data/adapter',
        HAS_SERIALIZER_PACKAGE: '@ember-data/serializer',
        HAS_DEBUG_PACKAGE: '@ember-data/debug',
      },
    ],
  ];
  return plugins;
};
