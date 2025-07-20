import { DEBUG } from '@warp-drive/core/build-config/env';

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
  /**
   * A string representing a unique identity.
   *
   * @public
   */
  lid: string;
}

export type StableDocumentIdentifier = {
  lid: string;
  type: '@document';
  /** @internal */
  [CACHE_OWNER]: number | undefined;
};
export type RequestKey = StableDocumentIdentifier;

/**
 * Used when an Identifier is known to be the stable version
 *
 * @internal
 */
export interface StableIdentifier extends Identifier {
  /** @internal */
  [DEBUG_IDENTIFIER_BUCKET]?: string;
}

/**
 * Used when a ResourceKey was not created locally as part
 * of a call to store.createRecord
 *
 * Distinguishing between this ResourceKey and one for a client created
 * resource that was created with an ID is generally speaking not possible
 * at runtime, so anything with an ID typically narrows to this.
 *
 * @internal
 */
export interface PersistedResourceKey<T extends string = string> extends StableIdentifier {
  /**
   * the primary `ResourceType` or "model name" this ResourceKey belongs to.
   *
   * @public
   */
  type: T;

  /** @internal */
  [CACHE_OWNER]: number | undefined;

  /**
   * the PrimaryKey for the resource this ResourceKey belongs to. `null`
   * if not yet assigned a PrimaryKey value.
   *
   * @public
   */
  id: string;

  /** @internal */
  [DEBUG_CLIENT_ORIGINATED]?: boolean;
  /** @internal */
  [DEBUG_STALE_CACHE_OWNER]?: number | undefined;
}

/** @deprecated use {@link PersistedResourceKey} */
export type StableExistingRecordIdentifier<T extends string = string> = PersistedResourceKey<T>;

/**
 * Used when a ResourceKey was created locally
 * (by a call to store.createRecord).
 *
 * It is possible in rare circumstances to have a ResourceKey
 * that is not for a new record but does not have an ID. This would
 * happen if a user intentionally created one for use with a secondary-index
 * prior to the record having been fully loaded.
 *
 * @internal
 */
export interface NewResourceKey<T extends string = string> extends StableIdentifier {
  /**
   * the primary resource `type` or `modelName` this identity belongs to.
   *
   * @public
   */
  type: T;

  /** @internal */
  [CACHE_OWNER]: number | undefined;

  /**
   * the primary id for the record this identity belongs to. `null`
   * if not yet assigned an id.
   *
   * @public
   */
  id: string | null;

  /** @internal */
  [DEBUG_CLIENT_ORIGINATED]?: boolean;
  /** @internal */
  [DEBUG_STALE_CACHE_OWNER]?: number | undefined;
}

/**
 * A referentially stable object with a unique string (lid) that can be used
 * as a reference to data in the cache.
 *
 * Every record instance has a unique identifier, and identifiers may refer
 * to data that has never been loaded (for instance, in an async relationship).
 *
 * @public
 */
export type ResourceKey<T extends string = string> = PersistedResourceKey<T> | NewResourceKey<T>;

/** @deprecated use {@link ResourceKey} */
export type StableRecordIdentifier<T extends string = string> = ResourceKey<T>;
