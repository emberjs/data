/**
 * Settings configuration for deprecations, optional features, development/testing
 * support and debug logging is done using `setConfig` in `ember-cli-build`.
 *
 * ```ts
 * 'use strict';
 *
 * const EmberApp = require('ember-cli/lib/broccoli/ember-app');
 *
 * module.exports = async function (defaults) {
 *   const { setConfig } = await import('@warp-drive/build-config');
 *
 *   const app = new EmberApp(defaults, {});
 *
 *   setConfig(app, __dirname, {
 *     // settings here
 *   });
 *
 *   const { Webpack } = require('@embroider/webpack');
 *   return require('@embroider/compat').compatBuild(app, Webpack, {});
 * };
 *
 * ```
 *
 * Available settings include:
 *
 * - [Debug Logging](../classes/DebugLogging)
 * - [Deprecated Code Removal](../classes/CurrentDeprecations)
 * - [Canary Feature Activation](../classes/CanaryFeatures)
 *
 * As well as:
 *
 * ### polyfillUUID
 *
 * If you are using the library in an environment that does not support `window.crypto.randomUUID`
 * you can enable a polyfill for it.
 *
 * ```ts
 * setConfig(app, __dirname, {
 *  polyfillUUID: true
 * });
 * ```
 *
 * ### includeDataAdapterInProduction
 *
 * By default, the integration required to support the ember inspector browser extension
 * is included in production builds only when using the `ember-data` package. Otherwise
 * the default is to exclude it. This setting allows to explicitly enable/disable it in
 * production builds.
 *
 * ```ts
 * setConfig(app, __dirname, {
 *   includeDataAdapterInProduction: true
 * });
 * ```
 *
 * @module @warp-drive/build-config
 * @main @warp-drive/build-config
 */
import EmbroiderMacros from '@embroider/macros/src/node.js';
import { getEnv } from './-private/utils/get-env.ts';
import { getDeprecations } from './-private/utils/deprecations.ts';
import { getFeatures } from './-private/utils/features.ts';
import * as LOGGING from './debugging.ts';
import type { MacrosConfig } from '@embroider/macros/src/node.js';
import { createLoggingConfig } from './-private/utils/logging.ts';

const _MacrosConfig = EmbroiderMacros.MacrosConfig as unknown as typeof MacrosConfig;

type LOG_CONFIG_KEY = keyof typeof LOGGING;

export type WarpDriveConfig = {
  debug?: Partial<InternalWarpDriveConfig['debug']>;
  polyfillUUID?: boolean;
  includeDataAdapterInProduction?: boolean;
  compatWith?: `${number}.${number}`;
  deprecations?: Partial<InternalWarpDriveConfig['deprecations']>;
  features?: Partial<InternalWarpDriveConfig['features']>;
};

type InternalWarpDriveConfig = {
  debug: { [key in LOG_CONFIG_KEY]: boolean };
  polyfillUUID: boolean;
  includeDataAdapter: boolean;
  compatWith: `${number}.${number}` | null;
  deprecations: ReturnType<typeof getDeprecations>;
  features: ReturnType<typeof getFeatures>;
  activeLogging: { [key in LOG_CONFIG_KEY]: boolean };
  env: {
    TESTING: boolean;
    PRODUCTION: boolean;
    DEBUG: boolean;
  };
};

type MacrosWithGlobalConfig = Omit<MacrosConfig, 'globalConfig'> & { globalConfig: Record<string, unknown> };

function recastMacrosConfig(macros: object): MacrosWithGlobalConfig {
  if (!('globalConfig' in macros)) {
    throw new Error('Expected MacrosConfig to have a globalConfig property');
  }
  return macros as MacrosWithGlobalConfig;
}

export function setConfig(context: object, appRoot: string, config: WarpDriveConfig): void {
  const macros = recastMacrosConfig(_MacrosConfig.for(context, appRoot));
  const isLegacySupport = (config as unknown as { ___legacy_support?: boolean }).___legacy_support;
  const hasDeprecatedConfig = isLegacySupport && Object.keys(config).length > 1;
  const hasInitiatedConfig = macros.globalConfig['WarpDrive'];

  // setConfig called by user prior to legacy support called
  if (isLegacySupport && hasInitiatedConfig) {
    if (hasDeprecatedConfig) {
      throw new Error(
        'You have provided a config object to setConfig, but are also using the legacy emberData options key in ember-cli-build. Please remove the emberData key from options.'
      );
    }
    return;
  }

  // legacy support called prior to user setConfig
  if (isLegacySupport && hasDeprecatedConfig) {
    // We don't want to print this just yet because we are going to re-arrange packages
    // and this would be come an import from @warp-drive/core. Better to not deprecate twice.
    // console.warn(
    //   `You are using the legacy emberData key in your ember-cli-build.js file. This key is deprecated and will be removed in the next major version of EmberData/WarpDrive. Please use \`import { setConfig } from '@warp-drive/build-config';\` instead.`
    // );
  }

  // included hooks run during class initialization of the EmberApp instance
  // so our hook will run before the user has a chance to call setConfig
  // else we could print a useful message here
  // else if (isLegacySupport) {
  //   console.warn(
  //     `WarpDrive requires your ember-cli-build file to set a base configuration for the project.\n\nUsage:\n\t\`import { setConfig } from '@warp-drive/build-config';\n\tsetConfig(app, __dirname, {});\``
  //   );
  // }

  const debugOptions: InternalWarpDriveConfig['debug'] = Object.assign({}, LOGGING, config.debug);

  const env = getEnv();
  const DEPRECATIONS = getDeprecations(config.compatWith || null, config.deprecations);
  const FEATURES = getFeatures(env.PRODUCTION);

  const includeDataAdapterInProduction =
    typeof config.includeDataAdapterInProduction === 'boolean' ? config.includeDataAdapterInProduction : true;
  const includeDataAdapter = env.PRODUCTION ? includeDataAdapterInProduction : true;

  const finalizedConfig: InternalWarpDriveConfig = {
    debug: debugOptions,
    polyfillUUID: config.polyfillUUID ?? false,
    includeDataAdapter,
    compatWith: config.compatWith ?? null,
    deprecations: DEPRECATIONS,
    features: FEATURES,
    activeLogging: createLoggingConfig(env, debugOptions),
    env,
  };

  macros.setGlobalConfig(import.meta.filename, 'WarpDrive', finalizedConfig);
}
