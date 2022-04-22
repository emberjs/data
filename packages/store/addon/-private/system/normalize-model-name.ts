import { dasherize } from '@ember/string';

import { DefaultRegistry, Registry, ResolvedRegistry } from '@ember-data/types';
import { RecordType } from '@ember-data/types/utils';

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
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>
>(modelName: T): T;
export default function normalizeModelName<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> & string = RecordType<R> & string
>(modelName: Exclude<string, T>): string;
export default function normalizeModelName<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> & string = RecordType<R> & string
>(modelName: T | Exclude<string, T>): T | string {
  return dasherize(modelName) as T;
}
