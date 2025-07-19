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

export interface ExistingRecordIdentifier<T extends string = string> extends Identifier {
  id: string;
  type: T;
}

export interface NewRecordIdentifier<T extends string = string> extends Identifier {
  id: string | null;
  type: T;
}

export type StableDocumentIdentifier = {
  lid: string;
};
export type RequestKey = StableDocumentIdentifier;

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
export interface StableIdentifier extends Identifier {
  /** @internal */
  [DEBUG_IDENTIFIER_BUCKET]?: string;
}

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
export interface StableExistingRecordIdentifier<T extends string = string> extends StableIdentifier {
  /**
   * the PrimaryKey for the resource this ResourceKey belongs to. `null`
   * if not yet assigned a PrimaryKey value.
   *
   * @public
   */
  id: string;
  /**
   * the primary `ResourceType` or "model name" this ResourceKey belongs to.
   *
   * @public
   */
  type: T;
  [DEBUG_CLIENT_ORIGINATED]?: boolean;
  [CACHE_OWNER]: number | undefined;
  [DEBUG_STALE_CACHE_OWNER]?: number | undefined;
}

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
export interface StableNewRecordIdentifier<T extends string = string> extends StableIdentifier {
  /**
   * the primary id for the record this identity belongs to. `null`
   * if not yet assigned an id.
   *
   * @public
   */
  id: string | null;
  /**
   * the primary resource `type` or `modelName` this identity belongs to.
   *
   * @public
   */
  type: T;
  /** @internal */
  [DEBUG_CLIENT_ORIGINATED]?: boolean;
  /** @internal */
  [CACHE_OWNER]: number | undefined;
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
export type ResourceKey<T extends string = string> = StableExistingRecordIdentifier<T> | StableNewRecordIdentifier<T>;

export type StableRecordIdentifier<T extends string = string> = ResourceKey<T>;
