/**
 * This package provides a build-plugin that enables configuration of deprecations,
 * optional features, development/testing support and debug logging.
 *
 * This configuration is done using `setConfig` in `ember-cli-build`.
 *
 * ```ts [ember-cli-build.js]
 * 'use strict';
 *
 * const EmberApp = require('ember-cli/lib/broccoli/ember-app');
 *
 * module.exports = async function (defaults) {
 *   const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]
 *
 *   const app = new EmberApp(defaults, {});
 *
 *   setConfig(app, __dirname, { // [!code focus:3]
 *     // settings here
 *   });
 *
 *   const { buildOnce } = await import('@embroider/vite');
 *   const { compatBuild } = await import('@embroider/compat');
 *
 *   return compatBuild(app, buildOnce);
 * };
 *
 * ```
 *
 * Available settings include:
 *
 * - {@link LOGGING | debugging}
 * - {@link DEPRECATIONS | deprecations}
 * - {@link FEATURES | features}
 * - {@link WarpDriveConfig.polyfillUUID | polyfillUUID}
 * - {@link WarpDriveConfig.includeDataAdapterInProduction | includeDataAdapterInProduction}
 * - {@link WarpDriveConfig.compatWith | compatWith}
 *
 * @module
 */

import EmbroiderMacros from '@embroider/macros/src/node.js';
import { getEnv } from './-private/utils/get-env.ts';
import { getDeprecations } from './-private/utils/deprecations.ts';
import { getFeatures } from './-private/utils/features.ts';
import * as LOGGING from './debugging.ts';
import type * as FEATURES from './canary-features.ts';
import type * as DEPRECATIONS from './deprecations.ts';
import type { MacrosConfig } from '@embroider/macros/src/node.js';
import { createLoggingConfig } from './-private/utils/logging.ts';
import type { PluginItem } from '@babel/core';
import { buildMacros } from '@embroider/macros/src/babel.js';

/**
 * Create the Babel plugin for WarpDrive
 *
 * Note: If your project already uses [@embroider/macros](https://www.npmjs.com/package/@embroider/macros)
 * then you should use {@link setConfig} instead of this function.
 *
 * @param options WarpDrive configuration options
 * @returns An array of Babel plugins
 */
export function babelPlugin(options: WarpDriveConfig): { gts: Function[]; js: PluginItem[] } {
  const macros = buildMacros({
    configure: (config) => {
      setConfig(config, options);
    },
  });

  const env = getEnv(options.forceMode);

  return {
    gts: macros.templateMacros,
    js: [
      // babel-plugin-debug-macros is temporarily needed
      // to convert deprecation/warn calls into console.warn
      [
        resolve('babel-plugin-debug-macros'),
        {
          flags: [],

          debugTools: {
            isDebug: env.DEBUG,
            source: '@ember/debug',
            assertPredicateIndex: 1,
          },
        },
        'ember-data-specific-macros-stripping-test',
      ],
      ...(macros.babelMacros as PluginItem[]),
    ],
  };
}

function resolve(module: string): string {
  const filePath = import.meta.resolve(module);
  const file = filePath.replace('/node_modules/.vite-temp/', '/');
  if (file.startsWith('file://')) {
    return file.slice(7);
  }
  return file;
}

const _MacrosConfig = EmbroiderMacros.MacrosConfig as unknown as typeof MacrosConfig;

/**
 * Build Configuration options for WarpDrive that
 * allow adjusting logging, deprecations, canary features
 * and optional features.
 */
export interface WarpDriveConfig {
  /**
   * An object of key/value pairs of logging flags
   *
   * see {@link LOGGING | debugging} for the available flags.
   *
   * ```ts
   * {
   *  LOG_CACHE: true,
   * }
   * ```
   *
   * @public
   */
  debug?: Partial<InternalWarpDriveConfig['debug']>;

  /**
   * If you are using the library in an environment that does not
   * support `window.crypto.randomUUID` you can enable a polyfill
   * for it.
   *
   * @public
   */
  polyfillUUID?: boolean;

  /**
   * By default, the integration required to support the ember-inspector
   * browser extension is included in production builds only when using
   * the `ember-data` package.
   *
   * Otherwise the default is to exclude it. This setting allows to explicitly
   * enable/disable it in production builds.
   *
   * @public
   */
  includeDataAdapterInProduction?: boolean;

  /**
   * The most recent version of the library from which all
   * deprecations have been resolved.
   *
   * For instance if all deprecations released prior to or
   * within `5.3` have been resolved, then setting this to
   * `5.3` will remove all the support for the deprecated
   * features for associated deprecations.
   *
   * :::caution **Universal Apps**
   * This value should be at least `5.6` for universal/non-ember
   * applications as that was the first version that builds
   * without any ember-source dependencies provided all deprecations
   * are resolved.
   * :::
   *
   * See {@link DEPRECATIONS | deprecations} for more details.
   */
  compatWith?: `${number}.${number}`;

  /**
   * An object of key/value pairs of logging flags
   *
   * see {@link DEPRECATIONS | deprecations} for the available flags.
   *
   * ```ts
   * {
   *   DEPRECATE_THING: false,
   * }
   * ```
   *
   * @public
   */
  deprecations?: Partial<InternalWarpDriveConfig['deprecations']>;

  /**
   * An object of key/value pairs of canary feature flags
   * for use when testing new features gated behind a flag
   * in a canary release version.
   *
   * see {@link FEATURES | features} for the available flags.
   *
   * ```ts
   * {
   *   FEATURE_A: true,
   * }
   * ```
   *
   * @public
   */
  features?: Partial<InternalWarpDriveConfig['features']>;

  /**
   * @private
   */
  forceMode?: 'testing' | 'production' | 'development';
}

interface InternalWarpDriveConfig {
  debug: typeof LOGGING;
  polyfillUUID: boolean;
  includeDataAdapter: boolean;
  compatWith: `${number}.${number}` | null;
  deprecations: ReturnType<typeof getDeprecations>;
  features: ReturnType<typeof getFeatures>;
  activeLogging: typeof LOGGING;
  env: {
    TESTING: boolean;
    PRODUCTION: boolean;
    DEBUG: boolean;
  };
}

type MacrosWithGlobalConfig = Omit<MacrosConfig, 'globalConfig'> & { globalConfig: Record<string, unknown> };

function recastMacrosConfig(macros: object): MacrosWithGlobalConfig {
  if (!('globalConfig' in macros)) {
    throw new Error('Expected MacrosConfig to have a globalConfig property');
  }
  return macros as MacrosWithGlobalConfig;
}

/**
 * Sets the build configuration for WarpDrive that ensures
 * environment specific behaviors are activated/deactivated
 * and enables adjusting log instrumentation, removing code
 * that supports deprecated features, enabling canary features
 * and enabling/disabling optional features.
 *
 * The library uses [@embroider/macros](https://www.npmjs.com/package/@embroider/macros)
 * to perform this final configuration code transform.
 *
 * This is a low level API for configuring WarpDrive. If your
 * project does not use `@embroider/macros` then you should use
 * {@link babelPlugin} instead of this function.
 *
 * ### Example
 *
 * ```ts
 * import { setConfig } from '@warp-drive/core/build-config';
 * import { buildMacros } from '@embroider/macros/babel';
 *
 * const Macros = buildMacros({
 *   configure: (config) => {
 *     setConfig(config, {
 *       compatWith: '5.6'
 *     });
 *   },
 * });
 *
 * export default {
 *   plugins: [
 *     // babel-plugin-debug-macros is temporarily needed
 *     // to convert deprecation/warn calls into console.warn
 *     [
 *       'babel-plugin-debug-macros',
 *       {
 *         flags: [],
 *
 *         debugTools: {
 *           isDebug: true,
 *           source: '@ember/debug',
 *           assertPredicateIndex: 1,
 *         },
 *       },
 *       'ember-data-specific-macros-stripping-test',
 *     ],
 *     ...Macros.babelMacros,
 *   ],
 * };
 * ```
 */
export function setConfig(macros: object, config: WarpDriveConfig): void;
export function setConfig(context: object, appRoot: string, config: WarpDriveConfig): void;
export function setConfig(context: object, appRootOrConfig: string | WarpDriveConfig, config?: WarpDriveConfig): void {
  const isEmberClassicUsage = arguments.length === 3;
  const macros = recastMacrosConfig(
    isEmberClassicUsage ? _MacrosConfig.for(context, appRootOrConfig as string) : context
  );

  const userConfig = isEmberClassicUsage ? config! : (appRootOrConfig as WarpDriveConfig);

  const isLegacySupport = (userConfig as unknown as { ___legacy_support?: boolean }).___legacy_support;
  const hasDeprecatedConfig = isLegacySupport && Object.keys(userConfig).length > 1;
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
    //   `You are using the legacy emberData key in your ember-cli-build.js file. This key is deprecated and will be removed in the next major version of WarpDrive. Please use \`import { setConfig } from '@warp-drive/build-config';\` instead.`
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

  const debugOptions: InternalWarpDriveConfig['debug'] = Object.assign({}, LOGGING, userConfig.debug);

  const env = getEnv(userConfig.forceMode);
  const DEPRECATIONS = getDeprecations(userConfig.compatWith || null, userConfig.deprecations);
  const FEATURES = getFeatures(env.PRODUCTION);

  const includeDataAdapterInProduction =
    typeof userConfig.includeDataAdapterInProduction === 'boolean' ? userConfig.includeDataAdapterInProduction : true;
  const includeDataAdapter = env.PRODUCTION ? includeDataAdapterInProduction : true;

  const finalizedConfig: InternalWarpDriveConfig = {
    debug: debugOptions,
    polyfillUUID: userConfig.polyfillUUID ?? false,
    includeDataAdapter,
    compatWith: userConfig.compatWith ?? null,
    deprecations: DEPRECATIONS,
    features: FEATURES,
    activeLogging: createLoggingConfig(env, debugOptions),
    env,
  };

  macros.setGlobalConfig(import.meta.filename, 'WarpDrive', finalizedConfig);
}
