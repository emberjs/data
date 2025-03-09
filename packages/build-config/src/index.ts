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

export function setConfig(context: object, appRoot: string, config: WarpDriveConfig) {
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
    console.warn(
      `You are using the legacy emberData key in your ember-cli-build.js file. This key is deprecated and will be removed in the next major version of EmberData/WarpDrive. Please use \`import { setConfig } from '@warp-drive/build-config';\` instead.`
    );
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
