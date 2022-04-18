import { dasherize } from '@ember/string';

import { DefaultRegistry, Registry } from '@ember-data/types';

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
// we're lying a bit here with the type, because what comes in *wont* be a key typically
// and what comes out *might not* be a key either.
export default function normalizeModelName<
  R extends Registry = DefaultRegistry['model'],
  K extends keyof R & string = keyof R & string
>(modelName: K): K;
export default function normalizeModelName<
  R extends Registry = DefaultRegistry['model'],
  K extends keyof R & string = keyof R & string
>(modelName: Exclude<string, K>): string;
export default function normalizeModelName<
  R extends Registry = DefaultRegistry['model'],
  K extends keyof R & string = keyof R & string
>(modelName: K | Exclude<string, K>): K | string {
  return dasherize(modelName) as K;
}
