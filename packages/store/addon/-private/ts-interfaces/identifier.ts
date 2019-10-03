/**
  @module @ember-data/store
*/
import { symbol } from '../ts-interfaces/utils/symbol';

// provided for additional debuggability
export const DEBUG_CLIENT_ORIGINATED: unique symbol = symbol('record-originated-on-client');
export const DEBUG_IDENTIFIER_BUCKET: unique symbol = symbol('identifier-bucket');

export interface Identifier {
  lid: string;
  clientId?: string;
}

/**
 * An Identifier specific to a record which may or may not
 * be present in the cache.
 *
 * The absence of an `id` DOES NOT indicate that this
 * Identifier is for a new client-created record as it
 * may also indicate that it was generated for a secondary
 * index and the primary `id` index is not yet known.
 */
export interface RecordIdentifier extends Identifier {
  id: string | null;
  type: string;
}

/**
 * Used when an Identifier is known to be the stable version
 *
 * @internal
 */
export interface StableIdentifier extends Identifier {
  [DEBUG_IDENTIFIER_BUCKET]?: string;
}

/**
 * Used when a RecordIdentifier is known to be the stable version
 *
 * @internal
 */
export interface StableRecordIdentifier extends StableIdentifier {
  id: string | null;
  type: string;
  [DEBUG_CLIENT_ORIGINATED]?: boolean;
}

/**
  A method which can expect to receive various data as its first argument
  and the name of a bucket as its second argument. Currently the second
  argument will always be `record` data should conform to a `json-api`
  `Resource` interface, but will be the normalized json data for a single
  resource that has been given to the store.

  The method must return a unique (to at-least the given bucket) string identifier
  for the given data as a string to be used as the `lid` of an `Identifier` token.

  This method will only be called by either `getOrCreateRecordIdentifier` or
  `createIdentifierForNewRecord` when an identifier for the supplied data
  is not already known via `lid` or `type + id` combo and one needs to be
  generated or retrieved from a proprietary cache.

  `data` will be the same data argument provided to `getOrCreateRecordIdentifier`
  and in the `createIdentifierForNewRecord` case will be an object with
  only `type` as a key.
*/
export type GenerationMethod = (data: Object, bucket: string) => string;

/*
 A method which can expect to receive an existing `Identifier` alongside
 some new data to consider as a second argument. This is an opportunity
 for secondary lookup tables and caches associated with the identifier
 to be amended.

 This method is called everytime `updateRecordIdentifier` is called and
  with the same arguments. It provides the opportunity to update secondary
  lookup tables for existing identifiers.

 It will always be called after an identifier created with `createIdentifierForNewRecord`
  has been committed, or after an update to the `record` a `RecordIdentifier`
  is assigned to has been committed. Committed here meaning that the server
  has acknowledged the update (for instance after a call to `.save()`)

 If `id` has not previously existed, it will be assigned to the `Identifier`
  prior to this `UpdateMethod` being called; however, calls to the parent method
  `updateRecordIdentifier` that attempt to change the `id` or calling update
  without providing an `id` when one is missing will throw an error.
*/
export type UpdateMethod = (identifier: StableIdentifier, newData: Object, bucket: string) => void;

/*
A method which can expect to receive an existing `Identifier` that should be eliminated
 from any secondary lookup tables or caches that the user has populated for it.
*/
export type ForgetMethod = (identifier: StableIdentifier, bucket: string) => void;

/*
 A method which can expect to be called when the parent application is destroyed.

 If you have properly used a WeakMap to encapsulate the state of your customization
 to the application instance, you may not need to implement the `resetMethod`.
*/
export type ResetMethod = () => void;
