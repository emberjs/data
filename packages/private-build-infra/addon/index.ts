import { has } from 'require';

import AVAILABLE_PACKAGES from './available-packages';

function flagState(flag: keyof typeof AVAILABLE_PACKAGES): boolean {
  const packageName = AVAILABLE_PACKAGES[flag];
  return has(packageName) || false;
}

export const HAS_EMBER_DATA_PACKAGE = flagState('HAS_EMBER_DATA_PACKAGE');
export const HAS_STORE_PACKAGE = flagState('HAS_STORE_PACKAGE');
export const HAS_MODEL_PACKAGE = flagState('HAS_MODEL_PACKAGE');
export const HAS_ADAPTER_PACKAGE = flagState('HAS_ADAPTER_PACKAGE');
export const HAS_SERIALIZER_PACKAGE = flagState('HAS_SERIALIZER_PACKAGE');
export const HAS_DEBUG_PACKAGE = flagState('HAS_DEBUG_PACKAGE');
export const HAS_RECORD_DATA_PACKAGE = flagState('HAS_RECORD_DATA_PACKAGE');
