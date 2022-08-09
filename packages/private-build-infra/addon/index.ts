import { macroCondition, moduleExists, getOwnConfig, dependencySatisfies } from '@embroider/macros';

function useDebugPackage() {
  if (macroCondition(dependencySatisfies('ember-data', '*alpha*'))) {
    return true;
  } else {
    if (macroCondition(moduleExists('@ember-data/debug'))) {
      const configObj: any = getOwnConfig();
      if (macroCondition(moduleExists('ember-data'))) {
        if (configObj.includeAdaperInProduction == undefined) {
          return true;
        } else {
          return configObj.includeAdapterInProduction;
        }
      } else {
        if (configObj.includeAdaperInProduction == undefined) {
          return false;
        } else {
          return configObj.includeAdapterInProduction;
        }
      }
    } else {
      return false;
    }
  }
}

export const HAS_EMBER_DATA_PACKAGE = macroCondition(moduleExists('HAS_EMBER_DATA_PACKAGE'));
export const HAS_STORE_PACKAGE = macroCondition(moduleExists('HAS_STORE_PACKAGE'));
export const HAS_MODEL_PACKAGE = macroCondition(moduleExists('HAS_MODEL_PACKAGE'));
export const HAS_ADAPTER_PACKAGE = macroCondition(moduleExists('HAS_ADAPTER_PACKAGE'));
export const HAS_SERIALIZER_PACKAGE = macroCondition(moduleExists('HAS_SERIALIZER_PACKAGE'));
export const HAS_DEBUG_PACKAGE = useDebugPackage();
export const HAS_RECORD_DATA_PACKAGE = macroCondition(moduleExists('HAS_RECORD_DATA_PACKAGE'));
