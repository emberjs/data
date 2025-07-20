import type { Cache, ChangedAttributesHash, RelationshipDiff } from '@warp-drive/core/types/cache';
import type { ResourceBlob } from '@warp-drive/core/types/cache/aliases';
import type { Change } from '@warp-drive/core/types/cache/change';
import type { Mutation } from '@warp-drive/core/types/cache/mutations';
import type { Operation } from '@warp-drive/core/types/cache/operations';
import type { CollectionRelationship, ResourceRelationship } from '@warp-drive/core/types/cache/relationship';
import type { PersistedResourceKey, ResourceKey, StableDocumentIdentifier } from '@warp-drive/core/types/identifier';
import type { Value } from '@warp-drive/core/types/json/raw';
import type { TypeFromInstanceOrString } from '@warp-drive/core/types/record';
import type { RequestContext, StructuredDataDocument, StructuredDocument } from '@warp-drive/core/types/request';
import type { ResourceDocument, SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';
import type { ApiError } from '@warp-drive/core/types/spec/error';
/**
 * The PersistedCache wraps a Cache to enhance it with
 * Persisted Storage capabilities.
 *
 * @class PersistedCache
 * @internal
 */
export class PersistedCache implements Cache {
  declare _cache: Cache;
  declare _db: IDBDatabase;
  declare version: '2';

  constructor(cache: Cache, db: IDBDatabase) {
    this.version = '2';
    this._cache = cache;
    this._db = db;
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
   * the individually cacheabl
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
   * @internal
   */
  put<T>(doc: StructuredDocument<T> | { content: T }): ResourceDocument {
    const result = this._cache.put(doc);

    if (!result.lid) {
      return result;
    }

    const transaction = this._db.transaction(['request', 'resource'], 'readwrite', { durability: 'relaxed' });
    const request = this._cache.peekRequest({ lid: result.lid })!;

    const requests = transaction.objectStore('request');
    const resources = transaction.objectStore('resource');

    requests.put(request);

    if ('data' in result && result.data) {
      const resourceData: PersistedResourceKey[] = Array.isArray(result.data) ? result.data : [result.data];
      resourceData.forEach((identifier) => {
        resources.put(this._cache.peek(identifier), identifier.lid);
      });
    }

    if ('included' in result && result.included) {
      const included: PersistedResourceKey[] = result.included;
      included.forEach((identifier) => {
        resources.put(this._cache.peek(identifier), identifier.lid);
      });
    }

    return result;
  }

  /**
   * Perform an operation on the cache to update the remote state.
   *
   * Note: currently the only valid operation is a MergeOperation
   * which occurs when a collision of identifiers is detected.
   *
   * @internal
   * @param op the operation to perform
   * @return {void}
   */
  patch(op: Operation): void {
    this._cache.patch(op);
  }

  /**
   * Update resource data with a local mutation. Currently supports operations
   * on relationships only.
   *
   * @internal
   * @param mutation
   */
  mutate(mutation: Mutation): void {
    this._cache.mutate(mutation);
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
   * not require retainining connections to the Store
   * and Cache to present data on a per-field basis.
   *
   * This generally takes the place of `getAttr` as
   * an API and may even take the place of `getRelationship`
   * depending on implementation specifics, though this
   * latter usage is less recommended due to the advantages
   * of the Graph handling necessary entanglements and
   * notifications for relational data.
   *
   * @internal
   * @param {ResourceKey | StableDocumentIdentifier} identifier
   * @return {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peek<T = unknown>(identifier: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
  peek(identifier: StableDocumentIdentifier): ResourceDocument | null;
  peek(identifier: ResourceKey | StableDocumentIdentifier): unknown {
    return this._cache.peek(identifier);
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
   * not require retainining connections to the Store
   * and Cache to present data on a per-field basis.
   *
   * This generally takes the place of `getAttr` as
   * an API and may even take the place of `getRelationship`
   * depending on implementation specifics, though this
   * latter usage is less recommended due to the advantages
   * of the Graph handling necessary entanglements and
   * notifications for relational data.
   *
   * @internal
   * @param {ResourceKey | StableDocumentIdentifier} identifier
   * @return {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peekRemoteState<T = unknown>(identifier: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
  peekRemoteState(identifier: StableDocumentIdentifier): ResourceDocument | null;
  peekRemoteState(identifier: ResourceKey | StableDocumentIdentifier): unknown {
    return this._cache.peekRemoteState(identifier);
  }

  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request
   *
   * @param {StableDocumentIdentifier}
   * @return {StableDocumentIdentifier | null}
   * @internal
   */
  peekRequest(identifier: StableDocumentIdentifier): StructuredDocument<ResourceDocument> | null {
    return this._cache.peekRequest(identifier);
  }

  /**
   * Push resource data from a remote source into the cache for this identifier
   *
   * @internal
   * @param identifier
   * @param data
   * @param hasRecord
   * @return {void | string[]} if `hasRecord` is true then calculated key changes should be returned
   */
  upsert(identifier: ResourceKey, data: ResourceBlob, hasRecord: boolean): void | string[] {
    return this._cache.upsert(identifier, data, hasRecord);
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
   * @internal
   * @return {Promise<Cache>}
   */
  fork(): Promise<Cache> {
    return this._cache.fork();
  }

  /**
   * Merge a fork back into a parent Cache.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to merge at the Store level, which will
   * utilize this method to merge the caches.
   *
   * @param {Cache} cache
   * @internal
   * @return {Promise<void>}
   */
  merge(cache: Cache): Promise<void> {
    return this._cache.merge(cache);
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
   * three properties: (1) the `identifier` of the entity that
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
   *  identifier: ResourceKey | StableDocumentIdentifier;
   *  op: 'upsert' | 'remove';
   *  patch?: unknown;
   * }
   * ```
   *
   * @internal
   */
  diff(): Promise<Change[]> {
    return this._cache.diff();
  }

  // SSR Support
  // ===========

  /**
   * Serialize the entire contents of the Cache into a Stream
   * which may be fed back into a new instance of the same Cache
   * via `cache.hydrate`.
   *
   * @return {Promise<ReadableStream>}
   * @internal
   */
  dump(): Promise<ReadableStream<unknown>> {
    return this._cache.dump();
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
   * @internal
   */
  hydrate(stream: ReadableStream<unknown>): Promise<void> {
    return this._cache.hydrate(stream);
  }

  // Cache
  // =====

  // Resource Support
  // ================

  /**
   * [LIFECYLCE] Signal to the cache that a new record has been instantiated on the client
   *
   * It returns properties from options that should be set on the record during the create
   * process. This return value behavior is deprecated.
   *
   * @internal
   * @param identifier
   * @param options
   */
  clientDidCreate(identifier: ResourceKey, options?: Record<string, unknown>): Record<string, unknown> {
    return this._cache.clientDidCreate(identifier, options);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @internal
   * @param identifier
   */
  willCommit(identifier: ResourceKey, context: RequestContext): void {
    this._cache.willCommit(identifier, context);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @internal
   * @param identifier
   * @param data
   */
  didCommit(identifier: ResourceKey, result: StructuredDataDocument<unknown>): SingleResourceDataDocument {
    return this._cache.didCommit(identifier, result);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @internal
   * @param identifier
   * @param errors
   */
  commitWasRejected(identifier: ResourceKey, errors?: ApiError[]): void {
    this._cache.commitWasRejected(identifier, errors);
  }

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * @internal
   * @param identifier
   */
  unloadRecord(identifier: ResourceKey): void {
    this._cache.unloadRecord(identifier);
  }

  // Granular Resource Data APIs
  // ===========================

  /**
   * Retrieve the data for an attribute from the cache
   *
   * @internal
   * @param identifier
   * @param propertyName
   * @return {unknown}
   */
  getAttr(identifier: ResourceKey, field: string): Value | undefined {
    return this._cache.getAttr(identifier, field);
  }

  /**
   * Retrieve the remote state for an attribute from the cache
   *
   * @internal
   * @param identifier
   * @param propertyName
   * @return {unknown}
   */
  getRemoteAttr(identifier: ResourceKey, field: string): Value | undefined {
    return this._cache.getRemoteAttr(identifier, field);
  }

  /**
   * Mutate the data for an attribute in the cache
   *
   * @internal
   * @param identifier
   * @param propertyName
   * @param value
   */
  setAttr(identifier: ResourceKey, propertyName: string, value: Value): void {
    this._cache.setAttr(identifier, propertyName, value);
  }

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * @internal
   * @param identifier
   * @return
   */
  changedAttrs(identifier: ResourceKey): ChangedAttributesHash {
    return this._cache.changedAttrs(identifier);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @internal
   * @param identifier
   * @return {Boolean}
   */
  hasChangedAttrs(identifier: ResourceKey): boolean {
    return this._cache.hasChangedAttrs(identifier);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * @internal
   * @param identifier
   * @return the names of attributes that were restored
   */
  rollbackAttrs(identifier: ResourceKey): string[] {
    return this._cache.rollbackAttrs(identifier);
  }

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
   * @param {ResourceKey} identifier
   * @return {Map<string, RelationshipDiff>}
   */
  changedRelationships(identifier: ResourceKey): Map<string, RelationshipDiff> {
    return this._cache.changedRelationships(identifier);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @public
   * @param {ResourceKey} identifier
   * @return {Boolean}
   */
  hasChangedRelationships(identifier: ResourceKey): boolean {
    return this._cache.hasChangedRelationships(identifier);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to relationships.
   *
   * This will also discard the change on any appropriate inverses.
   *
   * This method is a candidate to become a mutation
   *
   * @public
   * @param {ResourceKey} identifier
   * @return {String[]} the names of relationships that were restored
   */
  rollbackRelationships(identifier: ResourceKey): string[] {
    return this._cache.rollbackRelationships(identifier);
  }

  // Relationships
  // =============

  /**
   * Query the cache for the current state of a relationship property
   *
   * @internal
   * @param identifier
   * @param propertyName
   * @return resource relationship object
   */
  getRelationship(
    identifier: ResourceKey,
    field: string,
    isCollection?: boolean
  ): ResourceRelationship | CollectionRelationship {
    return this._cache.getRelationship(identifier, field, isCollection);
  }

  /**
   * Query the remote state for the current state of a relationship property
   *
   * @internal
   * @param identifier
   * @param propertyName
   * @return resource relationship object
   */
  getRemoteRelationship(
    identifier: ResourceKey,
    field: string,
    isCollection?: boolean
  ): ResourceRelationship | CollectionRelationship {
    return this._cache.getRemoteRelationship(identifier, field, isCollection);
  }

  // Resource State
  // ===============

  /**
   * Update the cache state for the given resource to be marked as locally deleted,
   * or remove such a mark.
   *
   * @internal
   * @param identifier
   * @param isDeleted
   */
  setIsDeleted(identifier: ResourceKey, isDeleted: boolean): void {
    this._cache.setIsDeleted(identifier, isDeleted);
  }

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @internal
   * @param identifier
   * @return
   */
  getErrors(identifier: ResourceKey): ApiError[] {
    return this._cache.getErrors(identifier);
  }

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @internal
   * @param identifier
   * @return {Boolean}
   */
  isEmpty(identifier: ResourceKey): boolean {
    return this._cache.isEmpty(identifier);
  }

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @internal
   * @param identifier
   * @return {Boolean}
   */
  isNew(identifier: ResourceKey): boolean {
    return this._cache.isNew(identifier);
  }

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @internal
   * @param identifier
   * @return {Boolean}
   */
  isDeleted(identifier: ResourceKey): boolean {
    return this._cache.isDeleted(identifier);
  }

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @internal
   * @param identifier
   * @return {Boolean}
   */
  isDeletionCommitted(identifier: ResourceKey): boolean {
    return this._cache.isDeletionCommitted(identifier);
  }
}
