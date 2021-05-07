import { dasherize } from '@ember/string';

/**
  @module @ember-data/store
*/

// All modelNames are dasherized internally. Changing this function may
// require changes to other normalization hooks (such as typeForRoot).

/**
 This method normalizes a modelName into the format Ember Data uses
 internally by dasherizing it.

  @method normalizeModelName
  @static
  @public
  @for @ember-data/store
  @param {String} modelName
  @return {String} normalizedModelName
*/
export default function normalizeModelName(modelName: string): string {
  return dasherize(modelName);
}
