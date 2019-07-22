/* globals EmberDataENV */

/**
  @module @ember-data/canary-features
*/

import { assign } from '@ember/polyfills';
import DEFAULT_FEATURES from './default-features';

const ENV = typeof EmberDataENV === 'object' && EmberDataENV !== null ? EmberDataENV : {};

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
export const REQUEST_SERVICE = featureValue(FEATURES.REQUEST_SERVICE);
export const IDENTIFIERS = featureValue(FEATURES.IDENTIFIERS);
