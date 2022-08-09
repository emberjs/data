import { dependencySatisfies, getOwnConfig, isDevelopingApp, macroCondition, moduleExists } from '@embroider/macros';

function hasDebugPackage() {
  if (macroCondition(moduleExists('@ember-data/debug'))) {
    if (macroCondition(!isDevelopingApp())) {
      if (
        macroCondition(
          moduleExists('ember-data') &&
            getOwnConfig<{ includeDataAdapterInProduction?: boolean }>().includeDataAdapterInProduction === undefined
        )
      ) {
        return true;
      }
      return macroCondition(getOwnConfig<{ includeDataAdapterInProduction: boolean }>().includeDataAdapterInProduction);
    }
    return true;
  }
  return false;
}

export const HAS_EMBER_DATA_PACKAGE = macroCondition(
  moduleExists('ember-data') && dependencySatisfies('ember-data', getOwnConfig<{ version: string }>().version)
);
export const HAS_STORE_PACKAGE = macroCondition(moduleExists('@ember-data/store'));
export const HAS_MODEL_PACKAGE = macroCondition(moduleExists('@ember-data/model'));
export const HAS_ADAPTER_PACKAGE = macroCondition(moduleExists('@ember-data/adapter'));
export const HAS_SERIALIZER_PACKAGE = macroCondition(moduleExists('@ember-data/serializer'));
export const HAS_DEBUG_PACKAGE = hasDebugPackage();
export const HAS_RECORD_DATA_PACKAGE = macroCondition(moduleExists('@ember-data/record-data'));
