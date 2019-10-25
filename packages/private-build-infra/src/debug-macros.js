'use strict';

const FEATURES = require('./features');

module.exports = function debugMacros(environment) {
  let plugins = [
    [
      require.resolve('babel-plugin-debug-macros'),
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
  ];

  return plugins;
};
