import { dasherize } from '@ember/string';

// All modelNames are dasherized internally. Changing this function may
// require changes to other normalization hooks (such as typeForRoot).

/**
 This method normalizes a modelName into the format Ember Data uses
 internally.

  @method normalizeModelName
  @public
  @param {String} modelName
  @return {String} normalizedModelName
  @for DS
*/
export default function normalizeModelName(modelName) {
  return dasherize(modelName);
}
