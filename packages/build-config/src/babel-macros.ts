import * as LOGGING from './virtual/debugging.ts';
import * as CURRENT_FEATURES from './virtual/canary-features.ts';
import * as CURRENT_DEPRECATIONS from './virtual/deprecations.ts';

type FEATURE = keyof typeof CURRENT_FEATURES;
const features = Object.keys(CURRENT_FEATURES) as FEATURE[];
const FEATURES = Object.assign({}, CURRENT_FEATURES) as Record<FEATURE, boolean>;
features.forEach((feature) => {
  let featureValue = FEATURES[feature];
  if (featureValue === null) {
    FEATURES[feature] = false;
  }
});

const config = {
  features: FEATURES,
  deprecations: CURRENT_DEPRECATIONS,
  debug: LOGGING,
};

export function macros() {
  const TransformDeprecations = import.meta.resolve('./babel-plugin-transform-deprecations.js');
  const TransformDebugLogging = import.meta.resolve('./babel-plugin-transform-logging.js');
  const TransformFeatures = import.meta.resolve('./babel-plugin-transform-features.js');

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
      '@warp-drive/build-config/deprecation-stripping',
    ],
    [
      TransformDebugLogging,
      {
        source: '@warp-drive/build-config/debugging',
        configKey: 'debug',
        flags: config.debug,
      },
      '@warp-drive/build-config/debugging-stripping',
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
}
