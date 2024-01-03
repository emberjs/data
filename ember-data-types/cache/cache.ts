/**
 * @module @ember-data/experimental-preview-types
 */
import { StoreRequestContext } from '@ember-data/store/-private/cache-handler';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { CollectionResourceRelationship, SingleResourceRelationship } from '../q/ember-data-json-api';
import { JsonApiError } from '../q/record-data-json-api';
import { ResourceBlob } from './aliases';
import { Change } from './change';
import { ResourceDocument, SingleResourceDataDocument, StructuredDataDocument, StructuredDocument } from './document';
import { StableDocumentIdentifier } from './identifier';
import { Mutation } from './mutations';
import { Operation } from './operations';

export type RelationshipDiff =
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

/**
 * The interface for EmberData Caches.
 *
 * A Cache handles in-memory storage of Document and Resource
 * data.
 *
 * @class <Interface> Cache
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
   * @method put
   * @param {StructuredDocument} doc
   * @returns {ResourceDocument}
   * @public
   */
  put<T>(doc: StructuredDocument<T>): ResourceDocument;

  /**
   * Update the "remote" or "canonical" (persisted) state of the Cache
   * by merging new information into the existing state.
   *
   * Note: currently the only valid resource operation is a MergeOperation
   * which occurs when a collision of identifiers is detected.
   *
   * @method patch
   * @public
   * @param {Operation} op the operation to perform
   * @returns {void}
   */
  patch(op: Operation): void;

  /**
   * Update the "local" or "current" (unpersisted) state of the Cache
   *
   * @method mutate
   * @param {Mutation} mutation
   * @returns {void}
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
   * @method peek
   * @public
   * @param {StableRecordIdentifier | StableDocumentIdentifier} identifier
   * @returns {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peek(identifier: StableRecordIdentifier): ResourceBlob | null;
  peek(identifier: StableDocumentIdentifier): ResourceDocument | null;

  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request
   *
   * @method peekRequest
   * @param {StableDocumentIdentifier}
   * @returns {StableDocumentIdentifier | null}
   * @public
   */
  peekRequest(identifier: StableDocumentIdentifier): StructuredDocument<ResourceDocument> | null;

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
  upsert(identifier: StableRecordIdentifier, data: ResourceBlob, hasRecord: boolean): void | string[];

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
  fork(): Promise<Cache>;

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
   * @method diff
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
   * @method dump
   * @returns {Promise<ReadableStream>}
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
   * @method hydrate
   * @param {ReadableStream} stream
   * @returns {Promise<void>}
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
   * @method clientDidCreate
   * @public
   * @param identifier
   * @param createArgs
   */
  clientDidCreate(identifier: StableRecordIdentifier, createArgs?: Record<string, unknown>): Record<string, unknown>;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @method willCommit
   * @public
   * @param identifier
   */
  willCommit(identifier: StableRecordIdentifier, context: StoreRequestContext): void;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @method didCommit
   * @public
   * @param identifier - the primary identifier that was operated on
   * @param data - a document in the cache format containing any updated data
   * @return {SingleResourceDataDocument}
   */
  didCommit(identifier: StableRecordIdentifier, result: StructuredDataDocument<unknown>): SingleResourceDataDocument;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @method commitWasRejected
   * @public
   * @param identifier
   * @param errors
   */
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[]): void;

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * This method is a candidate to become a mutation
   *
   * @method unloadRecord
   * @public
   * @param identifier
   */
  unloadRecord(identifier: StableRecordIdentifier): void;

  // Granular Resource Data APIs
  // ===========================

  /**
   * Retrieve the data for an attribute from the cache
   *
   * @method getAttr
   * @public
   * @param identifier
   * @param field
   * @returns {unknown}
   */
  getAttr(identifier: StableRecordIdentifier, field: string): unknown;

  /**
   * Mutate the data for an attribute in the cache
   *
   * This method is a candidate to become a mutation
   *
   * @method setAttr
   * @public
   * @param identifier
   * @param field
   * @param value
   */
  setAttr(identifier: StableRecordIdentifier, field: string, value: unknown): void;

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * Returns a map of field names to tuples of [old, new] values
   *
   * ```
   * { <field>: [<old>, <new>] }
   * ```
   *
   * @method changedAttrs
   * @public
   * @param identifier
   * @returns {Record<string, [unknown, unknown]>} { <field>: [<old>, <new>] }
   */
  changedAttrs(identifier: StableRecordIdentifier): Record<string, [unknown, unknown]>;

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @method hasChangedAttrs
   * @public
   * @param identifier
   * @returns {boolean}
   */
  hasChangedAttrs(identifier: StableRecordIdentifier): boolean;

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * This method is a candidate to become a mutation
   *
   * @method rollbackAttrs
   * @public
   * @param identifier
   * @returns {string[]} the names of fields that were restored
   */
  rollbackAttrs(identifier: StableRecordIdentifier): string[];

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
  changedRelationships(identifier: StableRecordIdentifier): Map<string, RelationshipDiff>;

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @method hasChangedRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @returns {boolean}
   */
  hasChangedRelationships(identifier: StableRecordIdentifier): boolean;

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
  rollbackRelationships(identifier: StableRecordIdentifier): string[];

  /**
   * Query the cache for the current state of a relationship property
   *
   * @method getRelationship
   * @public
   * @param {StableRecordIdentifier} identifier
   * @param {string} field
   * @returns resource relationship object
   */
  getRelationship(
    identifier: StableRecordIdentifier,
    field: string,
    isCollection?: boolean
  ): SingleResourceRelationship | CollectionResourceRelationship;

  // Resource State
  // ===============

  /**
   * Update the cache state for the given resource to be marked
   * as locally deleted, or remove such a mark.
   *
   * This method is a candidate to become a mutation
   *
   * @method setIsDeleted
   * @public
   * @param identifier
   * @param isDeleted {boolean}
   */
  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void;

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @method getErrors
   * @public
   * @param identifier
   * @returns {JsonApiError[]}
   */
  getErrors(identifier: StableRecordIdentifier): JsonApiError[];

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @method isEmpty
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isEmpty(identifier: StableRecordIdentifier): boolean;

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @method isNew
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isNew(identifier: StableRecordIdentifier): boolean;

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @method isDeleted
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isDeleted(identifier: StableRecordIdentifier): boolean;

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @method isDeletionCommitted
   * @public
   * @param identifier
   * @returns {boolean}
   */
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean;
}
