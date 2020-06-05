import { dasherize } from '@ember/string';

/**
  @module @ember-data/store
*/

// All modelNames are dasherized internally. Changing this function may
// require changes to other normalization hooks (such as typeForRoot).

/**
 This method normalizes a modelName into the format Ember Data uses
 internally.

  @function normalizeModelName
  @for @ember-data/store
  @param {String} modelName
  @return {String} normalizedModelName
*/
export default function normalizeModelName(modelName) {
  return dasherize(modelName);
}
