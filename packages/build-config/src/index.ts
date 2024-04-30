import { MacrosConfig } from '@embroider/macros/src/node.js';
import { getEnv } from './-private/utils/get-env.ts';
import { getDeprecations } from './-private/utils/deprecations.ts';
import { getFeatures } from './-private/utils/features.ts';
import * as LOGGING from './virtual/debugging.ts';

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
  const macros = recastMacrosConfig(MacrosConfig.for(context, appRoot));

  if (macros.globalConfig['WarpDrive']) {
    return;
  }

  const debugOptions: InternalWarpDriveConfig['debug'] = Object.assign({}, LOGGING, config.debug);

  const env = getEnv();
  const DEPRECATIONS = getDeprecations(config.compatWith || null);
  const FEATURES = getFeatures(env.PRODUCTION);

  const includeDataAdapterInProduction =
    typeof config.includeDataAdapterInProduction === 'boolean' ? config.includeDataAdapterInProduction : false;
  const includeDataAdapter = env.PRODUCTION ? includeDataAdapterInProduction : false;

  const finalizedConfig: InternalWarpDriveConfig = {
    debug: debugOptions,
    polyfillUUID: config.polyfillUUID ?? false,
    includeDataAdapter,
    compatWith: config.compatWith ?? null,
    deprecations: DEPRECATIONS,
    features: FEATURES,
    env,
  };
  macros.setGlobalConfig(import.meta.filename, 'WarpDrive', finalizedConfig);
}
