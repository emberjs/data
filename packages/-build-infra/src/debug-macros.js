'use strict';

const FEATURES = require('./features');

module.exports = function debugMacros(environment) {
  // let isDebug = environment !== 'production';

  let plugins = [
    [
      require.resolve('babel-plugin-debug-macros'),
      {
        flags: [
          {
            source: '@ember-data/canary-features',
            flags: Object.assign(
              // explicit list of additional exports within @ember/canary-features
              // without adding this (with a null value) an error is thrown during
              // the feature replacement process (e.g. XYZ is not a supported flag)
              {
                FEATURES: null,
                DEFAULT_FEATURES: null,
                isEnabled: null,
              },
              FEATURES
            ),
          },
        ],
      },
      '@ember-data/canary-features-stripping',
    ],
  ];

  return plugins;
};
