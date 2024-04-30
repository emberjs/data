'use strict';

module.exports = function debugMacros(config) {
  const TransformDeprecations = require.resolve('./transforms/babel-plugin-transform-deprecations');
  const TransformDebugLogging = require.resolve('./transforms/babel-plugin-transform-logging');
  const TransformFeatures = require.resolve('./transforms/babel-plugin-transform-features');

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
  ];

  return plugins;
};
