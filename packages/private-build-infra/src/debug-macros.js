'use strict';

module.exports = function debugMacros(app, isProd, config) {
  const FEATURES = require('./features')(isProd);
  const DEBUG = require('./debugging')(config.debug, isProd);
  const DEPRECATIONS = require('./deprecations')(config.compatWith, isProd);
  const debugMacrosPath = require.resolve('babel-plugin-debug-macros');
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
  ];

  return plugins;
};
