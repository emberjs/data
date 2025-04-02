import * as LOGGING from './debugging.ts';
import * as CURRENT_FEATURES from './canary-features.ts';
import * as CURRENT_DEPRECATIONS from './deprecations.ts';

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
  deprecations: Object.assign({}, CURRENT_DEPRECATIONS),
  debug: Object.assign({}, LOGGING),
};

type BabelPlugin = [string, Record<string, unknown>, string];

export function macros(): BabelPlugin[] {
  const TransformAsserts = import.meta.resolve('./babel-plugin-transform-asserts.cjs').slice(7);
  const TransformDeprecations = import.meta.resolve('./babel-plugin-transform-deprecations.cjs').slice(7);
  const TransformDebugLogging = import.meta.resolve('./babel-plugin-transform-logging.cjs').slice(7);
  const TransformFeatures = import.meta.resolve('./babel-plugin-transform-features.cjs').slice(7);

  let plugins = [
    [
      TransformAsserts,
      {
        sources: ['@warp-drive/build-config/macros', '@warp-drive/core/build-config/macros'],
      },
      '@warp-drive/core/build-config/asserts-stripping',
    ],
    [
      TransformFeatures,
      {
        sources: ['@warp-drive/build-config/canary-features', '@warp-drive/core/build-config/canary-features'],
        flags: config.features,
      },
      '@warp-drive/core/build-config/canary-features-stripping',
    ],
    [
      TransformDeprecations,
      {
        sources: ['@warp-drive/build-config/deprecations', '@warp-drive/core/build-config/deprecations'],
        flags: config.deprecations,
      },
      '@warp-drive/core/build-config/deprecation-stripping',
    ],
    [
      TransformDebugLogging,
      {
        sources: ['@warp-drive/build-config/debugging', '@warp-drive/core/build-config/debugging'],
        configKey: 'debug',
        runtimeKey: 'activeLogging',
        flags: config.debug,
      },
      '@warp-drive/core/build-config/debugging-stripping',
    ],
    [
      TransformDebugLogging,
      {
        sources: ['@warp-drive/build-config/env', '@warp-drive/core/build-config/env'],
        configKey: 'env',
        flags: {
          TESTING: true,
          PRODUCTION: true,
          DEBUG: true,
          IS_RECORDING: true,
          IS_CI: true,
          SHOULD_RECORD: true,
        },
      },
      '@warp-drive/core/build-config/env',
    ],
  ] satisfies BabelPlugin[];

  return plugins;
}
