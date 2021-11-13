/* globals EmberDataENV */

import DEFAULT_FEATURES from './default-features';

type FeatureList = {
  [key in keyof typeof DEFAULT_FEATURES]: boolean | null;
};

interface ConfigEnv {
  ENABLE_OPTIONAL_FEATURES?: boolean;
  FEATURES?: FeatureList;
}

declare global {
  export const EmberDataENV: ConfigEnv | undefined | null;
}
const ENV: ConfigEnv = typeof EmberDataENV !== 'undefined' && EmberDataENV !== null ? EmberDataENV : {};

function featureValue(value: boolean | null): boolean | null {
  if (ENV.ENABLE_OPTIONAL_FEATURES && value === null) {
    return true;
  }

  return value;
}

export const FEATURES: FeatureList = Object.assign({}, DEFAULT_FEATURES, ENV.FEATURES);
export const SAMPLE_FEATURE_FLAG = featureValue(FEATURES.SAMPLE_FEATURE_FLAG);
export const RECORD_DATA_ERRORS = featureValue(FEATURES.RECORD_DATA_ERRORS);
export const RECORD_DATA_STATE = featureValue(FEATURES.RECORD_DATA_STATE);
export const REQUEST_SERVICE = featureValue(FEATURES.REQUEST_SERVICE);
export const IDENTIFIERS = featureValue(FEATURES.IDENTIFIERS);
export const CUSTOM_MODEL_CLASS = featureValue(FEATURES.CUSTOM_MODEL_CLASS);
export const FULL_LINKS_ON_RELATIONSHIPS = featureValue(FEATURES.FULL_LINKS_ON_RELATIONSHIPS);
export const RECORD_ARRAY_MANAGER_IDENTIFIERS = featureValue(FEATURES.RECORD_ARRAY_MANAGER_IDENTIFIERS);
export const REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT = featureValue(
  FEATURES.REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT
);
