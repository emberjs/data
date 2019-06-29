/* globals EmberDataENV */

import { assign } from '@ember/polyfills';

const ENV = typeof EmberDataENV === 'object' && EmberDataENV !== null ? EmberDataENV : {};

// TODO: Make this file the source of truth, currently this must match
//   the contents of `packages/-build-infra/src/features.js`
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
