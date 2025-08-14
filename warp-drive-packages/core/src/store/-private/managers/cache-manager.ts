import type { Cache, ChangedAttributesHash, RelationshipDiff } from '../../../types/cache.ts';
import type { Change } from '../../../types/cache/change.ts';
import type { Operation } from '../../../types/cache/operations.ts';
import type { CollectionRelationship, ResourceRelationship } from '../../../types/cache/relationship.ts';
import type { LocalRelationshipOperation } from '../../../types/graph.ts';
import type { RequestKey, ResourceKey } from '../../../types/identifier.ts';
import type { Value } from '../../../types/json/raw.ts';
import type { StructuredDataDocument, StructuredDocument } from '../../../types/request.ts';
import type { ResourceDocument, SingleResourceDataDocument } from '../../../types/spec/document.ts';
import type { ApiError } from '../../../types/spec/error.ts';
import type { StoreRequestContext } from '../cache-handler/handler.ts';

/**
 * The CacheManager wraps a Cache enforcing that only
 * the public API surface area is exposed.
 *
 * Hence, it is the value of `Store.cache`, wrapping
 * the cache instance returned by `Store.createCache`.
 *
 * It handles translating between cache versions when
 * necessary, for instance when a Store is configured
 * to use both a v1 and a v2 cache depending on some
 * heuristic.
 *
 * Starting with the v2 spec, the cache is designed such
 * that it must be implemented as a singleton.
 *
 * @class CacheManager
 * @public
 */
export class CacheManager implements Cache {
  version = '2' as const;

  declare private ___cache: Cache;

  constructor(cache: Cache) {
    this.___cache = cache;
  }

  // Cache Management
  // ================

  /**
   * Cache the response to a request
   *
   * Unlike `store.push` which has UPSERT
   * semantics, `put` has `replace` semantics similar to
   * the `http` method `PUT`
   *
   * the individually cacheable
   * e resource data it may contain
   * should upsert, but the document data surrounding it should
   * fully replace any existing information
   *
   * Note that in order to support inserting arbitrary data
   * to the cache that did not originate from a request `put`
   * should expect to sometimes encounter a document with only
   * a `content` member and therefor must not assume the existence
   * of `request` and `response` on the document.
   *
   * @param {StructuredDocument} doc
   * @return {ResourceDocument}
   * @public
   */
  put<T>(doc: StructuredDocument<T> | { content: T }): ResourceDocument {
    return this.___cache.put(doc);
  }

  /**
   * Perform an operation on the cache to update the remote state.
   *
   * @public
   * @param op the operation to perform
   * @return {void}
   */
  patch(op: Operation | Operation[]): void {
    this.___cache.patch(op);
  }

  /**
   * Update resource data with a local mutation. Currently supports operations
   * on relationships only.
   *
   * @public
   * @param mutation
   */
  mutate(mutation: LocalRelationshipOperation): void {
    this.___cache.mutate(mutation);
  }

  /**
   * Peek resource data from the Cache.
   *
   * In development, if the return value
   * is JSON the return value
   * will be deep-cloned and deep-frozen
   * to prevent mutation thereby enforcing cache
   * Immutability.
   *
   * This form of peek is useful for implementations
   * that want to feed raw-data from cache to the UI
   * or which want to interact with a blob of data
   * directly from the presentation cache.
   *
   * An implementation might want to do this because
   * de-referencing records which read from their own
   * blob is generally safer because the record does
   * not require retaining connections to the Store
   * and Cache to present data on a per-field basis.
   *
   * This generally takes the place of `getAttr` as
   * an API and may even take the place of `getRelationship`
   * depending on implementation specifics, though this
   * latter usage is less recommended due to the advantages
   * of the Graph handling necessary entanglements and
   * notifications for relational data.
   *
   * @public
   * @param {ResourceKey | RequestKey} cacheKey
   * @return {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peek(cacheKey: ResourceKey): unknown;
  peek(cacheKey: RequestKey): ResourceDocument | null;
  peek(cacheKey: ResourceKey | RequestKey): unknown {
    return this.___cache.peek(cacheKey as ResourceKey);
  }

  peekRemoteState(cacheKey: ResourceKey): unknown;
  peekRemoteState(cacheKey: RequestKey): ResourceDocument | null;
  peekRemoteState(cacheKey: ResourceKey | RequestKey): unknown {
    return this.___cache.peekRemoteState(cacheKey as ResourceKey);
  }
  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request
   *
   * @param {RequestKey}
   * @return {RequestKey | null}
   * @public
   */
  peekRequest(key: RequestKey): StructuredDocument<ResourceDocument> | null {
    return this.___cache.peekRequest(key);
  }

  /**
   * Push resource data from a remote source into the cache for this ResourceKey
   *
   * @public
   * @return if `hasRecord` is true then calculated key changes should be returned
   */
  upsert(key: ResourceKey, data: unknown, hasRecord: boolean): void | string[] {
    return this.___cache.upsert(key, data, hasRecord);
  }

  // Cache Forking Support
  // =====================

  /**
   * Create a fork of the cache from the current state.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to fork at the Store level, which will
   * utilize this method to fork the cache.
   *
   * @public
   * @return {Promise<Cache>}
   */
  fork(): Promise<Cache> {
    return this.___cache.fork();
  }

  /**
   * Merge a fork back into a parent Cache.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to merge at the Store level, which will
   * utilize this method to merge the caches.
   *
   * @param {Cache} cache
   * @public
   * @return {Promise<void>}
   */
  merge(cache: Cache): Promise<void> {
    return this.___cache.merge(cache);
  }

  /**
   * Generate the list of changes applied to all
   * record in the store.
   *
   * Each individual resource or document that has
   * been mutated should be described as an individual
   * `Change` entry in the returned array.
   *
   * A `Change` is described by an object containing up to
   * three properties: (1) the `ResourceKey` of the entity that
   * changed; (2) the `op` code of that change being one of
   * `upsert` or `remove`, and if the op is `upsert` a `patch`
   * containing the data to merge into the cache for the given
   * entity.
   *
   * This `patch` is opaque to the Store but should be understood
   * by the Cache and may expect to be utilized by an Adapter
   * when generating data during a `save` operation.
   *
   * It is generally recommended that the `patch` contain only
   * the updated state, ignoring fields that are unchanged
   *
   * ```ts
   * interface Change {
   *  key: ResourceKey | RequestKey;
   *  op: 'upsert' | 'remove';
   *  patch?: unknown;
   * }
   * ```
   *
   * @public
   */
  diff(): Promise<Change[]> {
    return this.___cache.diff();
  }

  // SSR Support
  // ===========

  /**
   * Serialize the entire contents of the Cache into a Stream
   * which may be fed back into a new instance of the same Cache
   * via `cache.hydrate`.
   *
   * @return {Promise<ReadableStream>}
   * @public
   */
  dump(): Promise<ReadableStream<unknown>> {
    return this.___cache.dump();
  }

  /**
   * hydrate a Cache from a Stream with content previously serialized
   * from another instance of the same Cache, resolving when hydration
   * is complete.
   *
   * This method should expect to be called both in the context of restoring
   * the Cache during application rehydration after SSR **AND** at unknown
   * times during the lifetime of an already booted application when it is
   * desired to bulk-load additional information into the cache. This latter
   * behavior supports optimizing pre/fetching of data for route transitions
   * via data-only SSR modes.
   *
   * @param {ReadableStream} stream
   * @return {Promise<void>}
   * @public
   */
  hydrate(stream: ReadableStream<unknown>): Promise<void> {
    return this.___cache.hydrate(stream);
  }

  // Cache
  // =====

  // Resource Support
  // ================

  /**
   * [LIFECYCLE] Signal to the cache that a new record has been instantiated on the client
   *
   * It returns properties from options that should be set on the record during the create
   * process. This return value behavior is deprecated.
   *
   * @public
   */
  clientDidCreate(key: ResourceKey, options?: Record<string, unknown>): Record<string, unknown> {
    return this.___cache.clientDidCreate(key, options);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @public
   * @param key
   */
  willCommit(key: ResourceKey, context: StoreRequestContext): void {
    this.___cache.willCommit(key, context);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @public
   */
  didCommit(key: ResourceKey, result: StructuredDataDocument<unknown>): SingleResourceDataDocument {
    return this.___cache.didCommit(key, result);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @public
   */
  commitWasRejected(key: ResourceKey, errors?: ApiError[]): void {
    this.___cache.commitWasRejected(key, errors);
  }

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * @public
   */
  unloadRecord(key: ResourceKey): void {
    this.___cache.unloadRecord(key);
  }

  // Granular Resource Data APIs
  // ===========================

  /**
   * Retrieve the data for an attribute from the cache
   *
   * @public
   */
  getAttr(key: ResourceKey, propertyName: string): Value | undefined {
    return this.___cache.getAttr(key, propertyName);
  }

  /**
   * Retrieve the remote state for an attribute from the cache
   *
   * @public
   */
  getRemoteAttr(key: ResourceKey, propertyName: string): Value | undefined {
    return this.___cache.getRemoteAttr(key, propertyName);
  }

  /**
   * Mutate the data for an attribute in the cache
   *
   * @public
   */
  setAttr(key: ResourceKey, propertyName: string, value: Value): void {
    this.___cache.setAttr(key, propertyName, value);
  }

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * @public
   */
  changedAttrs(key: ResourceKey): ChangedAttributesHash {
    return this.___cache.changedAttrs(key);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @public
   */
  hasChangedAttrs(key: ResourceKey): boolean {
    return this.___cache.hasChangedAttrs(key);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * @public
   * @return the names of attributes that were restored
   */
  rollbackAttrs(key: ResourceKey): string[] {
    return this.___cache.rollbackAttrs(key);
  }

  // Relationships
  // =============

  /**
   * Query the cache for the changes to relationships of a resource.
   *
   * Returns a map of relationship names to RelationshipDiff objects.
   *
   * ```ts
   * type RelationshipDiff =
  | {
      kind: 'collection';
      remoteState: ResourceKey[];
      additions: Set<ResourceKey>;
      removals: Set<ResourceKey>;
      localState: ResourceKey[];
      reordered: boolean;
    }
  | {
      kind: 'resource';
      remoteState: ResourceKey | null;
      localState: ResourceKey | null;
    };
    ```
   *
   * @public
   */
  changedRelationships(key: ResourceKey): Map<string, RelationshipDiff> {
    return this.___cache.changedRelationships(key);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @public
   */
  hasChangedRelationships(key: ResourceKey): boolean {
    return this.___cache.hasChangedRelationships(key);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to relationships.
   *
   * This will also discard the change on any appropriate inverses.
   *
   * This method is a candidate to become a mutation
   *
   * @public
   * @return the names of relationships that were restored
   */
  rollbackRelationships(key: ResourceKey): string[] {
    return this.___cache.rollbackRelationships(key);
  }

  /**
   * Query the cache for the current state of a relationship property
   *
   * @public
   * @return resource relationship object
   */
  getRelationship(key: ResourceKey, propertyName: string): ResourceRelationship | CollectionRelationship {
    return this.___cache.getRelationship(key, propertyName);
  }

  /**
   * Query the cache for the remote state of a relationship property
   *
   * @public
   * @return resource relationship object
   */
  getRemoteRelationship(key: ResourceKey, propertyName: string): ResourceRelationship | CollectionRelationship {
    return this.___cache.getRemoteRelationship(key, propertyName);
  }

  // Resource State
  // ===============

  /**
   * Update the cache state for the given resource to be marked as locally deleted,
   * or remove such a mark.
   *
   * @public
   */
  setIsDeleted(key: ResourceKey, isDeleted: boolean): void {
    this.___cache.setIsDeleted(key, isDeleted);
  }

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @public
   */
  getErrors(key: ResourceKey): ApiError[] {
    return this.___cache.getErrors(key);
  }

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @public
   */
  isEmpty(key: ResourceKey): boolean {
    return this.___cache.isEmpty(key);
  }

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @public
   */
  isNew(key: ResourceKey): boolean {
    return this.___cache.isNew(key);
  }

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @public
   */
  isDeleted(key: ResourceKey): boolean {
    return this.___cache.isDeleted(key);
  }

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @public
   */
  isDeletionCommitted(key: ResourceKey): boolean {
    return this.___cache.isDeletionCommitted(key);
  }
}
