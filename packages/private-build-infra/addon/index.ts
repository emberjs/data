/**
  @module @ember-data/private-build-infra
*/

import { has } from 'require';
import POSSIBLE_PACKAGES from './available-packages';

type PackageSettings = Record<keyof typeof POSSIBLE_PACKAGES, boolean>;

const PACKAGES = Object.keys(POSSIBLE_PACKAGES).reduce((obj, name) => {
  const NAME = POSSIBLE_PACKAGES[name];
  obj[NAME] = has(name) || false;
  return obj;
}, {}) as PackageSettings;

export const HAS_EMBER_DATA_PACKAGE = PACKAGES.HAS_EMBER_DATA_PACKAGE;
export const HAS_STORE_PACKAGE = PACKAGES.HAS_STORE_PACKAGE;
export const HAS_MODEL_PACKAGE = PACKAGES.HAS_MODEL_PACKAGE;
export const HAS_ADAPTER_PACKAGE = PACKAGES.HAS_ADAPTER_PACKAGE;
export const HAS_SERIALIZER_PACKAGE = PACKAGES.HAS_SERIALIZER_PACKAGE;
export const HAS_DEBUG_PACKAGE = PACKAGES.HAS_DEBUG_PACKAGE;
export const HAS_RECORD_DATA_PACKAGE = PACKAGES.HAS_RECORD_DATA_PACKAGE;
