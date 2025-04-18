/**
  @module @ember-data/store
*/

import { DEBUG } from '@warp-drive/build-config/env';

// provided for additional debuggability
export const DEBUG_CLIENT_ORIGINATED: unique symbol = Symbol('record-originated-on-client');
export const DEBUG_IDENTIFIER_BUCKET: unique symbol = Symbol('identifier-bucket');
export const DEBUG_STALE_CACHE_OWNER: unique symbol = Symbol('warpDriveStaleCache');

function ProdSymbol<T extends string>(str: T, debugStr: string): T {
  return DEBUG ? (Symbol(debugStr) as unknown as T) : str;
}

// also present in production
export const CACHE_OWNER: '__$co' = ProdSymbol('__$co', 'CACHE_OWNER');

export type IdentifierBucket = 'record' | 'document';

export interface Identifier {
  lid: string;
  clientId?: string;
}

export interface ExistingRecordIdentifier<T extends string = string> extends Identifier {
  id: string;
  type: T;
}

export interface NewRecordIdentifier<T extends string = string> extends Identifier {
  id: string | null;
  type: T;
}

/**
 * Represents a CacheKey for a Request.
 *
 * This CacheKey is used both to identify the originating request
 * and the content returned in the response.
 *
 * @typedoc
 */
export interface RequestCacheKey {
  lid: string;
  type: '@document';
  [CACHE_OWNER]: number | undefined;
}

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
export type RecordIdentifier<T extends string = string> = ExistingRecordIdentifier<T> | NewRecordIdentifier<T>;

/**
 * Used when an Identifier is known to be the stable version
 *
 * @internal
 */
interface ResourceCacheKeyBase<T extends string = string> extends Identifier {
  type: T;
  [CACHE_OWNER]: number | undefined;
  [DEBUG_IDENTIFIER_BUCKET]?: string;
  [DEBUG_CLIENT_ORIGINATED]?: boolean;
  [DEBUG_STALE_CACHE_OWNER]?: number | undefined;
}

/**
 * Used when a ResourceCacheKey was not created locally as part
 * of a call to store.createRecord
 *
 * Distinguishing between this Identifier and one for a client created
 * record that was created with an ID is generally speaking not possible
 * at runtime, so anything with an ID typically narrows to this.
 *
 * @internal
 */
export interface ExistingResourceCacheKey<T extends string = string> extends ResourceCacheKeyBase<T> {
  id: string;
}

/**
 * Used when a ResourceCacheKey was created locally
 * (by a call to store.createRecord).
 *
 * It is possible in rare circumstances to have a ResourceCacheKey
 * that is not for a new record but does not have an ID. This would
 * happen if a user intentionally created one for use with a secondary-index
 * prior to the record having been fully loaded.
 *
 * @internal
 */
export interface NewResourceCacheKey<T extends string = string> extends ResourceCacheKeyBase<T> {
  id: string | null;
}

/**
 * A referentially stable object with a unique string (lid) that can be used
 * as a reference to data in the cache.
 *
 * Every record instance has a unique identifier, and identifiers may refer
 * to data that has never been loaded (for instance, in an async relationship).
 *
 * @class ResourceCacheKey
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
export type ResourceCacheKey<T extends string = string> = ExistingResourceCacheKey<T> | NewResourceCacheKey<T>;
