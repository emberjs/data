import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { CollectionResourceRelationship, SingleResourceRelationship } from '@warp-drive/core-types/spec/raw';

import type { LocalRelationshipOperation } from '@ember-data/graph/-private/-operations';
import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';

import type { RelationshipDiff } from '../../-types/cache/cache';
import type { Change } from '../../-types/cache/change';
import type { ResourceDocument, SingleResourceDataDocument } from '../../-types/cache/document';
import type { StableDocumentIdentifier } from '../../-types/cache/identifier';
import type { Cache, ChangedAttributesHash, MergeOperation } from '../../-types/q/cache';
import type { JsonApiError, JsonApiResource } from '../../-types/q/record-data-json-api';
import type { StoreRequestContext } from '../cache-handler';

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

  #cache: Cache;

  constructor(cache: Cache) {
    this.#cache = cache;
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
   * @method put
   * @param {StructuredDocument} doc
   * @returns {ResourceDocument}
   * @public
   */
  put<T>(doc: StructuredDocument<T> | { content: T }): ResourceDocument {
    return this.#cache.put(doc);
  }

  /**
   * Perform an operation on the cache to update the remote state.
   *
   * Note: currently the only valid operation is a MergeOperation
   * which occurs when a collision of identifiers is detected.
   *
   * @method patch
   * @public
   * @param op the operation to perform
   * @returns {void}
   */
  patch(op: MergeOperation): void {
    this.#cache.patch(op);
  }

  /**
   * Update resource data with a local mutation. Currently supports operations
   * on relationships only.
   *
   * @method mutate
   * @public
   * @param mutation
   */
  mutate(mutation: LocalRelationshipOperation): void {
    this.#cache.mutate(mutation);
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
   * @method peek
   * @public
   * @param {StableRecordIdentifier | StableDocumentIdentifier} identifier
   * @returns {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peek(identifier: StableRecordIdentifier): unknown;
  peek(identifier: StableDocumentIdentifier): ResourceDocument | null;
  peek(identifier: StableRecordIdentifier | StableDocumentIdentifier): unknown {
    return this.#cache.peek(identifier);
  }

  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request
   *
   * @method peekRequest
   * @param {StableDocumentIdentifier}
   * @returns {StableDocumentIdentifier | null}
   * @public
   */
  peekRequest(identifier: StableDocumentIdentifier): StructuredDocument<ResourceDocument> | null {
    return this.#cache.peekRequest(identifier);
  }

  /**
   * Push resource data from a remote source into the cache for this identifier
   *
   * @method upsert
   * @public
   * @param identifier
   * @param data
   * @param hasRecord
   * @returns {void | string[]} if `hasRecord` is true then calculated key changes should be returned
   */
  upsert(identifier: StableRecordIdentifier, data: JsonApiResource, hasRecord: boolean): void | string[] {
    return this.#cache.upsert(identifier, data, hasRecord);
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
   * @method fork
   * @public
   * @returns Promise<Cache>
   */
  fork(): Promise<Cache> {
    return this.#cache.fork();
  }

  /**
   * Merge a fork back into a parent Cache.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to merge at the Store level, which will
   * utilize this method to merge the caches.
   *
   * @method merge
   * @param {Cache} cache
   * @public
   * @returns Promise<void>
   */
  merge(cache: Cache): Promise<void> {
    return this.#cache.merge(cache);
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
   *  identifier: StableRecordIdentifier | StableDocumentIdentifier;
   *  op: 'upsert' | 'remove';
   *  patch?: unknown;
   * }
   * ```
   *
   * @method diff
   * @public
   */
  diff(): Promise<Change[]> {
    return this.#cache.diff();
  }

  // SSR Support
  // ===========

  /**
   * Serialize the entire contents of the Cache into a Stream
   * which may be fed back into a new instance of the same Cache
   * via `cache.hydrate`.
   *
   * @method dump
   * @returns {Promise<ReadableStream>}
   * @public
   */
  dump(): Promise<ReadableStream<unknown>> {
    return this.#cache.dump();
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
   * @method hydrate
   * @param {ReadableStream} stream
   * @returns {Promise<void>}
   * @public
   */
  hydrate(stream: ReadableStream<unknown>): Promise<void> {
    return this.#cache.hydrate(stream);
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
   * @method clientDidCreate
   * @public
   * @param identifier
   * @param options
   */
  clientDidCreate(identifier: StableRecordIdentifier, options?: Record<string, unknown>): Record<string, unknown> {
    return this.#cache.clientDidCreate(identifier, options);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @method willCommit
   * @public
   * @param identifier
   */
  willCommit(identifier: StableRecordIdentifier, context: StoreRequestContext): void {
    this.#cache.willCommit(identifier, context);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @method didCommit
   * @public
   * @param identifier
   * @param data
   */
  didCommit(identifier: StableRecordIdentifier, result: StructuredDataDocument<unknown>): SingleResourceDataDocument {
    return this.#cache.didCommit(identifier, result);
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @method commitWasRejected
   * @public
   * @param identifier
   * @param errors
   */
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[]): void {
    this.#cache.commitWasRejected(identifier, errors);
  }

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * @method unloadRecord
   * @public
   * @param identifier
   */
  unloadRecord(identifier: StableRecordIdentifier): void {
    this.#cache.unloadRecord(identifier);
  }

  // Granular Resource Data APIs
  // ===========================

  /**
   * Retrieve the data for an attribute from the cache
   *
   * @method getAttr
   * @public
   * @param identifier
   * @param propertyName
   * @returns {unknown}
   */
  getAttr(identifier: StableRecordIdentifier, propertyName: string): unknown {
    return this.#cache.getAttr(identifier, propertyName);
  }

  /**
   * Mutate the data for an attribute in the cache
   *
   * @method setAttr
   * @public
   * @param identifier
   * @param propertyName
   * @param value
   */
  setAttr(identifier: StableRecordIdentifier, propertyName: string, value: unknown): void {
    this.#cache.setAttr(identifier, propertyName, value);
  }

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * @method changedAttrs
   * @public
   * @param identifier
   * @returns
   */
  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash {
    return this.#cache.changedAttrs(identifier);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @method hasChangedAttrs
   * @public
   * @param identifier
   * @returns {boolean}
   */
  hasChangedAttrs(identifier: StableRecordIdentifier): boolean {
    return this.#cache.hasChangedAttrs(identifier);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * @method rollbackAttrs
   * @public
   * @param identifier
   * @returns the names of attributes that were restored
   */
  rollbackAttrs(identifier: StableRecordIdentifier): string[] {
    return this.#cache.rollbackAttrs(identifier);
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
      remoteState: StableRecordIdentifier[];
      additions: Set<StableRecordIdentifier>;
      removals: Set<StableRecordIdentifier>;
      localState: StableRecordIdentifier[];
      reordered: boolean;
    }
  | {
      kind: 'resource';
      remoteState: StableRecordIdentifier | null;
      localState: StableRecordIdentifier | null;
    };
    ```
   *
   * @method changedRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @returns {Map<string, RelationshipDiff>}
   */
  changedRelationships(identifier: StableRecordIdentifier): Map<string, RelationshipDiff> {
    return this.#cache.changedRelationships(identifier);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @method hasChangedRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @returns {boolean}
   */
  hasChangedRelationships(identifier: StableRecordIdentifier): boolean {
    return this.#cache.hasChangedRelationships(identifier);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to relationships.
   *
   * This will also discard the change on any appropriate inverses.
   *
   * This method is a candidate to become a mutation
   *
   * @method rollbackRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @returns {string[]} the names of relationships that were restored
   */
  rollbackRelationships(identifier: StableRecordIdentifier): string[] {
    return this.#cache.rollbackRelationships(identifier);
  }

  /**
   * Query the cache for the current state of a relationship property
   *
   * @method getRelationship
   * @public
   * @param identifier
   * @param propertyName
   * @returns resource relationship object
   */
  getRelationship(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): SingleResourceRelationship | CollectionResourceRelationship {
    return this.#cache.getRelationship(identifier, propertyName);
  }

  // Resource State
  // ===============

  /**
   * Update the cache state for the given resource to be marked as locally deleted,
   * or remove such a mark.
   *
   * @method setIsDeleted
   * @public
   * @param identifier
   * @param isDeleted
   */
  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void {
    this.#cache.setIsDeleted(identifier, isDeleted);
  }

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @method getErrors
   * @public
   * @param identifier
   * @returns
   */
  getErrors(identifier: StableRecordIdentifier): JsonApiError[] {
    return this.#cache.getErrors(identifier);
  }

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @method isEmpty
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isEmpty(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isEmpty(identifier);
  }

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @method isNew
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isNew(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isNew(identifier);
  }

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @method isDeleted
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isDeleted(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isDeleted(identifier);
  }

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @method isDeletionCommitted
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isDel;
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isDeletionCommitted(identifier);
  }
}
