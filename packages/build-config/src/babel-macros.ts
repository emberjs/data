/**
 * Babel plugins that convert constants and expressions into [macroConditions](https://www.npmjs.com/package/@embroider/macros#the-macros)
 * so that they can be stripped from the code during the build process.
 *
 * This allows us to have great DX around common configuration patterns
 * while still being able to ship a small and fast library.
 *
 * Transforms
 *
 * - deprecation constants imported from `@warp-drive/build-config/deprecations`
 * - feature flags imported from `@warp-drive/build-config/canary-features`
 * - debug logging constants imported from `@warp-drive/build-config/debugging`
 * - environment constants imported from `@warp-drive/build-config/env`
 * - expressionts imported from `@warp-drive/build-config/macros`
 *
 * Addons and apps can use these plugins to match the code-stripping behaviors of
 * ***Warp*Drive**. This is useful when managing migrations for canary features
 * and deprecations.
 *
 * @module
 */
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

/**
 * @returns an array of Babel plugins that can be used for code-stripping
 *   based on the configuration supplied to `setConfig` and the current ENV.
 *
 * - deprecation constants imported from `@warp-drive/build-config/deprecations`
 * - feature flags imported from `@warp-drive/build-config/canary-features`
 * - debug logging constants imported from `@warp-drive/build-config/debugging`
 * - environment constants imported from `@warp-drive/build-config/env`
 * - expressionts imported from `@warp-drive/build-config/macros`
 */
export function macros(): BabelPlugin[] {
  const TransformAsserts = import.meta.resolve('./babel-plugin-transform-asserts.cjs').slice(7);
  const TransformDeprecations = import.meta.resolve('./babel-plugin-transform-deprecations.cjs').slice(7);
  const TransformDebugLogging = import.meta.resolve('./babel-plugin-transform-logging.cjs').slice(7);
  const TransformFeatures = import.meta.resolve('./babel-plugin-transform-features.cjs').slice(7);

  let plugins = [
    [TransformAsserts, {}, '@warp-drive/build-config/asserts-stripping'],
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
        runtimeKey: 'activeLogging',
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
          IS_RECORDING: true,
          IS_CI: true,
          SHOULD_RECORD: true,
        },
      },
      '@warp-drive/build-config/env',
    ],
  ] satisfies BabelPlugin[];

  return plugins;
}
