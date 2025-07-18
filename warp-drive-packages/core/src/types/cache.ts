import type { ResourceBlob } from './cache/aliases.ts';
import type { Change } from './cache/change.ts';
import type { Mutation } from './cache/mutations.ts';
import type { Operation } from './cache/operations.ts';
import type { CollectionRelationship, ResourceRelationship } from './cache/relationship.ts';
import type { ResourceKey, StableDocumentIdentifier } from './identifier.ts';
import type { Value } from './json/raw.ts';
import type { TypeFromInstanceOrString } from './record.ts';
import type { RequestContext, StructuredDataDocument, StructuredDocument } from './request.ts';
import type { ResourceDocument, SingleResourceDataDocument } from './spec/document.ts';
import type { ApiError } from './spec/error.ts';

/**
 * A hash of changed attributes with the key being the attribute name and the value being an
 * array of `[oldValue, newValue]`.
 *
 * @internal
 */
export type ChangedAttributesHash = Record<string, [Value | undefined, Value]>;

export type RelationshipDiff =
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

/**
 * The interface for WarpDrive Caches.
 *
 * A Cache handles in-memory storage of Document and Resource
 * data.
 *
 * @class (Interface) Cache
 * @public
 */
export interface Cache {
  /**
   * The Cache Version that this implementation implements.
   *
   * @type {'2'}
   * @public
   * @property version
   */
  version: '2';

  // Cache Management
  // ================

  /**
   * Cache the response to a request
   *
   * Unlike `store.push` which has UPSERT
   * semantics, `put` has `replace` semantics similar to
   * the `http` method `PUT`
   *
   * the individually cacheable resource data it may contain
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
  put<T>(doc: StructuredDocument<T> | { content: T }): ResourceDocument;

  /**
   * Update the "remote" or "canonical" (persisted) state of the Cache
   * by merging new information into the existing state.
   *
   * @public
   * @param {Operation | Operation[]} op the operation(s) to perform
   * @return {void}
   */
  patch(op: Operation | Operation[]): void;

  /**
   * Update the "local" or "current" (unpersisted) state of the Cache
   *
   * @param {Mutation} mutation
   * @return {void}
   * @public
   */
  mutate(mutation: Mutation): void;

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
   * @public
   * @param {ResourceKey | StableDocumentIdentifier} identifier
   * @return {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peek<T = unknown>(identifier: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
  peek(identifier: StableDocumentIdentifier): ResourceDocument | null;

  /**
   * Peek remote resource data from the Cache.
   *
   * This will give the data provided from the server without any local changes.
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
   * @public
   * @param {ResourceKey | StableDocumentIdentifier} identifier
   * @return {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peekRemoteState<T = unknown>(identifier: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
  peekRemoteState(identifier: StableDocumentIdentifier): ResourceDocument | null;

  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request
   *
   * This is effectively the reverse of `put` for a request in
   * that it will return the the request, response, and content
   * whereas `peek` will return just the `content`.
   *
   * @param {StableDocumentIdentifier}
   * @return {StructuredDocument<ResourceDocument> | null}
   * @public
   */
  peekRequest(identifier: StableDocumentIdentifier): StructuredDocument<ResourceDocument> | null;

  /**
   * Push resource data from a remote source into the cache for this identifier
   *
   * @public
   * @param identifier
   * @param data
   * @param hasRecord
   * @return {void | string[]} if `hasRecord` is true then calculated key changes should be returned
   */
  upsert(identifier: ResourceKey, data: ResourceBlob, hasRecord: boolean): void | string[];

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
  fork(): Promise<Cache>;

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
  merge(cache: Cache): Promise<void>;

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
   * @public
   */
  diff(): Promise<Change[]>;

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
  dump(): Promise<ReadableStream<unknown>>;

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
  hydrate(stream: ReadableStream<unknown>): Promise<void>;

  // Resource Support
  // ================

  /**
   * [LIFECYCLE] Signal to the cache that a new record has been instantiated on the client
   *
   * It returns properties from options that should be set on the record during the create
   * process. This return value behavior is deprecated.
   *
   * @public
   * @param identifier
   * @param createArgs
   */
  clientDidCreate(identifier: ResourceKey, createArgs?: Record<string, unknown>): Record<string, unknown>;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @public
   * @param identifier
   */
  willCommit(identifier: ResourceKey, context: RequestContext | null): void;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @public
   * @param identifier - the primary identifier that was operated on
   * @param data - a document in the cache format containing any updated data
   * @return {SingleResourceDataDocument}
   */
  didCommit(identifier: ResourceKey, result: StructuredDataDocument<unknown> | null): SingleResourceDataDocument;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @public
   * @param identifier
   * @param errors
   */
  commitWasRejected(identifier: ResourceKey, errors?: ApiError[]): void;

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * This method is a candidate to become a mutation
   *
   * @public
   * @param identifier
   */
  unloadRecord(identifier: ResourceKey): void;

  // Granular Resource Data APIs
  // ===========================

  /**
   * Retrieve the data for an attribute from the cache
   *
   * @public
   * @param identifier
   * @param field
   * @return {unknown}
   */
  getAttr(identifier: ResourceKey, field: string | string[]): Value | undefined;

  /**
   * Retrieve remote state without any local changes for a specific attribute
   *
   * @public
   * @param identifier
   * @param field
   * @return {unknown}
   */
  getRemoteAttr(identifier: ResourceKey, field: string | string[]): Value | undefined;

  /**
   * Mutate the data for an attribute in the cache
   *
   * This method is a candidate to become a mutation
   *
   * @public
   * @param identifier
   * @param field
   * @param value
   */
  setAttr(identifier: ResourceKey, field: string | string[], value: Value): void;

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * Returns a map of field names to tuples of [old, new] values
   *
   * ```
   * { <field>: [<old>, <new>] }
   * ```
   *
   * @public
   * @param identifier
   * @return {Record<string, [unknown, unknown]>} `{ <field>: [<old>, <new>] }`
   */
  changedAttrs(identifier: ResourceKey): ChangedAttributesHash;

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @public
   * @param identifier
   * @return {Boolean}
   */
  hasChangedAttrs(identifier: ResourceKey): boolean;

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * This method is a candidate to become a mutation
   *
   * @public
   * @param identifier
   * @return {String[]} the names of fields that were restored
   */
  rollbackAttrs(identifier: ResourceKey): string[];

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
   * @public
   * @param {ResourceKey} identifier
   * @return {Map<string, RelationshipDiff>}
   */
  changedRelationships(identifier: ResourceKey): Map<string, RelationshipDiff>;

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @public
   * @param {ResourceKey} identifier
   * @return {Boolean}
   */
  hasChangedRelationships(identifier: ResourceKey): boolean;

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
  rollbackRelationships(identifier: ResourceKey): string[];

  /**
   * Query the cache for the current state of a relationship property
   *
   * @public
   * @param {ResourceKey} identifier
   * @param {String} field
   * @return resource relationship object
   */
  getRelationship(
    identifier: ResourceKey,
    field: string,
    isCollection?: boolean
  ): ResourceRelationship | CollectionRelationship;

  /**
   * Query the cache for the server state of a relationship property without any local changes
   *
   * @public
   * @param {ResourceKey} identifier
   * @param {String} field
   * @return resource relationship object
   */
  getRemoteRelationship(
    identifier: ResourceKey,
    field: string,
    isCollection?: boolean
  ): ResourceRelationship | CollectionRelationship;

  // Resource State
  // ===============

  /**
   * Update the cache state for the given resource to be marked
   * as locally deleted, or remove such a mark.
   *
   * This method is a candidate to become a mutation
   *
   * @public
   * @param identifier
   * @param {Boolean} isDeleted
   */
  setIsDeleted(identifier: ResourceKey, isDeleted: boolean): void;

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @public
   */
  getErrors(identifier: ResourceKey): ApiError[];

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @public
   * @param identifier
   * @return {Boolean}
   */
  isEmpty(identifier: ResourceKey): boolean;

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @public
   * @param identifier
   * @return {Boolean}
   */
  isNew(identifier: ResourceKey): boolean;

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @public
   * @param identifier
   * @return {Boolean}
   */
  isDeleted(identifier: ResourceKey): boolean;

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @public
   * @param identifier
   * @return {Boolean}
   */
  isDeletionCommitted(identifier: ResourceKey): boolean;
}
