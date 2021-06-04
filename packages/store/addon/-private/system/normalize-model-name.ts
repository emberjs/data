import { dasherize } from '@ember/string';

type AdapterRegistry = import('../ts-interfaces/registries').AdapterRegistry;
type SerializerRegistry = import('../ts-interfaces/registries').SerializerRegistry;
type ModelRegistry = import('../ts-interfaces/registries').ModelRegistry;
type lookupKeys = keyof SerializerRegistry | keyof AdapterRegistry | keyof ModelRegistry;

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
  @param {String} type
  @return {String} normalizedModelName
*/
export default function normalizeModelName<K = lookupKeys>(type: string): K {
  return dasherize(type) as Extract<K, string>;
}
