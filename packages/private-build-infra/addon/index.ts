/**
  @module @ember-data/private-build-infra
*/

import { has } from 'require';
import AVAILABLE_PACKAGES from './available-packages';

type PackageSettings = {
  [key in keyof typeof AVAILABLE_PACKAGES]: boolean;
};

const PACKAGES = {} as PackageSettings;
Object.keys(AVAILABLE_PACKAGES).forEach(name => {
  const NAME = AVAILABLE_PACKAGES[name];
  PACKAGES[NAME] = has(name) || false;
});

export const HAS_EMBER_DATA_PACKAGE = PACKAGES.HAS_EMBER_DATA_PACKAGE;
export const HAS_STORE_PACKAGE = PACKAGES.HAS_STORE_PACKAGE;
export const HAS_MODEL_PACKAGE = PACKAGES.HAS_MODEL_PACKAGE;
export const HAS_ADAPTER_PACKAGE = PACKAGES.HAS_ADAPTER_PACKAGE;
export const HAS_SERIALIZER_PACKAGE = PACKAGES.HAS_SERIALIZER_PACKAGE;
export const HAS_DEBUG_PACKAGE = PACKAGES.HAS_DEBUG_PACKAGE;
export const HAS_RECORD_DATA_PACKAGE = PACKAGES.HAS_RECORD_DATA_PACKAGE;
