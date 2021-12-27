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
