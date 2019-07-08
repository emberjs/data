/* globals EmberDataENV */

import { assign } from '@ember/polyfills';

const ENV = typeof EmberDataENV === 'object' && EmberDataENV !== null ? EmberDataENV : {};

// -build-infra/src/features consumes this variable to
// populate the default features
export const DEFAULT_FEATURES = {
  SAMPLE_FEATURE_FLAG: null,
  RECORD_DATA_ERRORS: null,
  RECORD_DATA_STATE: null,
};

function featureValue(value) {
  if (ENV.ENABLE_OPTIONAL_FEATURES && value === null) {
    return true;
  }

  return value;
}

export const FEATURES = assign({}, DEFAULT_FEATURES, ENV.FEATURES);
export const SAMPLE_FEATURE_FLAG = featureValue(FEATURES.SAMPLE_FEATURE_FLAG);
export const RECORD_DATA_ERRORS = featureValue(FEATURES.RECORD_DATA_ERRORS);
export const RECORD_DATA_STATE = featureValue(FEATURES.RECORD_DATA_STATE);
