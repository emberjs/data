/**
  @module @ember-data/store
*/

// provided for additional debuggability
const DEBUG_CLIENT_ORIGINATED = Symbol('record-originated-on-client');
const DEBUG_IDENTIFIER_BUCKET = Symbol('identifier-bucket');
const DEBUG_STALE_CACHE_OWNER = Symbol('warpDriveStaleCache');

// also present in production
const CACHE_OWNER = Symbol('warpDriveCache');

/**
 * An Identifier specific to a record which may or may not
 * be present in the cache.
 *
 * The absence of an `id` DOES NOT indicate that this
 * Identifier is for a new client-created record as it
 * may also indicate that it was generated for a secondary
 * index and the primary `id` index is not yet known.
 *
 * @internal
 */

/**
 * Used when an Identifier is known to be the stable version
 *
 * @internal
 */

/**
 * Used when a StableRecordIdentifier was not created locally as part
 * of a call to store.createRecord
 *
 * Distinguishing between this Identifier and one for a client created
 * record that was created with an ID is generally speaking not possible
 * at runtime, so anything with an ID typically narrows to this.
 *
 * @internal
 */

/**
 * Used when a StableRecordIdentifier was created locally
 * (by a call to store.createRecord).
 *
 * It is possible in rare circumstances to have a StableRecordIdentifier
 * that is not for a new record but does not have an ID. This would
 * happen if a user intentionally created one for use with a secondary-index
 * prior to the record having been fully loaded.
 *
 * @internal
 */

/**
 * A referentially stable object with a unique string (lid) that can be used
 * as a reference to data in the cache.
 *
 * Every record instance has a unique identifier, and identifiers may refer
 * to data that has never been loaded (for instance, in an async relationship).
 *
 * @class StableRecordIdentifier
 * @public
 */

/**
 * A string representing a unique identity.
 *
 * @property {string} lid
 * @public
 */
/**
 * the primary resource `type` or `modelName` this identity belongs to.
 *
 * @property {string} type
 * @public
 */
/**
 * the primary id for the record this identity belongs to. `null`
 * if not yet assigned an id.
 *
 * @property {string | null} id
 * @public
 */

export { CACHE_OWNER, DEBUG_CLIENT_ORIGINATED, DEBUG_IDENTIFIER_BUCKET, DEBUG_STALE_CACHE_OWNER };