import { MacrosConfig } from '@embroider/macros/src/node';
import { detectModule } from './-private/utils/detect-module';
import { getEnv } from './-private/utils/get-env';

export type WarpDriveConfig = {
  debug?: Partial<InternalWarpDriveConfig['debug']>;
  polyfillUUID?: boolean;
  includeDataAdapterInProduction?: boolean;
  compatWith?: `${number}.${number}`;
  deprecations?: Partial<InternalWarpDriveConfig['deprecations']>;
  features?: Partial<InternalWarpDriveConfig['features']>;
};

type InternalWarpDriveConfig = {
  debug: {
    LOG_PAYLOADS: boolean;
    LOG_OPERATIONS: boolean;
    LOG_MUTATIONS: boolean;
    LOG_REQUESTS: boolean;
    LOG_REQEST_STATUS: boolean;
    LOG_IDENTIFIERS: boolean;
    LOG_GRAPH: boolean;
    LOG_INSTANCE_CACHE: boolean;
  };
  polyfillUUID: boolean;
  includeDataAdapter: boolean;
  compatWith: `${number}.${number}`;
  deprecations: {
    DEPRECATE_CATCH_ALL: boolean;
    DEPRECATE_COMPUTED_CHAINS: boolean;
    DEPRECATE_NON_STRICT_TYPES: boolean;
    DEPRECATE_NON_STRICT_ID: boolean;
    DEPRECATE_LEGACY_IMPORTS: boolean;
    DEPRECATE_NON_UNIQUE_PAYLOADS: boolean;
    DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE: boolean;
    DEPRECATE_MANY_ARRAY_DUPLICATES: boolean;
  };
  features: {};
  packages: {
    HAS_ADAPTER_PACKAGE: boolean;
    HAS_COMPAT_PACKAGE: boolean;
    HAS_DEBUG_PACKAGE: boolean;
    HAS_EMBER_DATA_PACKAGE: boolean;
    HAS_GRAPH_PACKAGE: boolean;
    HAS_JSON_API_PACKAGE: boolean;
    HAS_MODEL_PACKAGE: boolean;
    HAS_REQUEST_PACKAGE: boolean;
    HAS_SERIALIZER_PACKAGE: boolean;
    HAS_STORE_PACKAGE: boolean;
    HAS_TRACKING_PACKAGE: boolean;
  };
  env: {
    TESTING: boolean;
    PRODUCTION: boolean;
    DEBUG: boolean;
  };
};

export function setConfig(context: object, config: WarpDriveConfig) {
  const macros = MacrosConfig.for(context);

  if (macros.getGlobalConfig<InternalWarpDriveConfig>('WarpDrive')) {
    return;
  }

  const debugOptions: InternalWarpDriveConfig['debug'] = Object.assign(
    {
      LOG_PAYLOADS: false,
      LOG_OPERATIONS: false,
      LOG_MUTATIONS: false,
      LOG_REQUESTS: false,
      LOG_REQEST_STATUS: false,
      LOG_IDENTIFIERS: false,
      LOG_GRAPH: false,
      LOG_INSTANCE_CACHE: false,
    },
    config.debug
  );

  const HAS_DEBUG_PACKAGE = detectModule(require, '@ember-data/debug', __dirname, pkg);
  const HAS_EMBER_DATA_PACKAGE = detectModule(require, 'ember-data', __dirname, pkg);
  const env = getEnv();

  const DEPRECATIONS = require('@ember-data/private-build-infra/src/deprecations')(hostOptions.compatWith || null);
  const FEATURES = require('@ember-data/private-build-infra/src/features')(isProd);

  const ALL_PACKAGES = requireModule('@ember-data/private-build-infra/virtual-packages/packages.js');
  const MACRO_PACKAGE_FLAGS = Object.assign({}, ALL_PACKAGES.default);
  delete MACRO_PACKAGE_FLAGS['HAS_DEBUG_PACKAGE'];

  Object.keys(MACRO_PACKAGE_FLAGS).forEach((key) => {
    MACRO_PACKAGE_FLAGS[key] = detectModule(require, MACRO_PACKAGE_FLAGS[key], __dirname, pkg);
  });

  const includeDataAdapterInProduction =
    typeof options.includeDataAdapterInProduction === 'boolean'
      ? options.includeDataAdapterInProduction
      : HAS_META_PACKAGE;
  const includeDataAdapter = HAS_DEBUG_PACKAGE ? (isProd ? includeDataAdapterInProduction : true) : false;

  const finalizedConfig = config;
  macros.setGlobalConfig(import.meta.file, 'WarpDrive', finalizedConfig);
}
