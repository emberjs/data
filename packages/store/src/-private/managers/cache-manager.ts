import { assert, deprecate } from '@ember/debug';

import type { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';
import { StructuredDataDocument } from '@ember-data/request/-private/types';
import { ResourceDocument, StructuredDocument } from '@ember-data/types/cache/document';
import type { Cache, CacheV1, ChangedAttributesHash, MergeOperation } from '@ember-data/types/q/cache';
import type {
  CollectionResourceRelationship,
  JsonApiDocument,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource, JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';
import type { Dict } from '@ember-data/types/q/utils';

import { isStableIdentifier } from '../caches/identifier-cache';
import type Store from '../store-service';

export function legacyCachePut(
  store: Store,
  doc: StructuredDataDocument<JsonApiDocument> | { data: JsonApiDocument }
): ResourceDocument {
  const jsonApiDoc = doc.data;
  let ret: ResourceDocument;
  store._join(() => {
    let included = jsonApiDoc.included;
    let i: number, length: number;

    if (included) {
      for (i = 0, length = included.length; i < length; i++) {
        store._instanceCache.loadData(included[i]);
      }
    }

    if (Array.isArray(jsonApiDoc.data)) {
      length = jsonApiDoc.data.length;
      let identifiers: StableExistingRecordIdentifier[] = [];

      for (i = 0; i < length; i++) {
        identifiers.push(store._instanceCache.loadData(jsonApiDoc.data[i]));
      }
      ret = { data: identifiers };
      return;
    }

    if (jsonApiDoc.data === null) {
      ret = { data: null };
      return;
    }

    assert(
      `Expected an object in the 'data' property in a call to 'push', but was ${typeof jsonApiDoc.data}`,
      typeof jsonApiDoc.data === 'object'
    );

    ret = { data: store._instanceCache.loadData(jsonApiDoc.data) };
    return;
  });

  return ret!;
}

/**
 * The CacheManager wraps a Cache enforcing that only
 * the public API surface area is exposed.
 *
 * Hence, it is the value of `Store.cache`, wrapping
 * the cache instance returned by `Store.createCache`.
 *
 * This class is the the return value of both the
 * `recordDataFor` function supplied to the store
 * hook `instantiateRecord`, and the `recordDataFor`
 * method on the `CacheStoreWrapper`. It is not
 * directly instantiatable.
 *
 * It handles translating between cache versions when
 * necessary, for instance when a Store is configured
 * to use both a v1 and a v2 cache depending on some
 * heuristic.
 *
 * Starting with the v2 spec, the cache is designed such
 * that it must be implemented as a singleton. However,
 * because the v1 spec was not designed for this whenever
 * we encounter any v1 cache we must wrap all caches, even
 * singletons, in non-singleton managers to preserve v1
 * compatibility.
 *
 * To avoid this performance penalty being paid by all
 * applications, singleton behavior may be opted-in via
 * the configuration supplied to your Ember application
 * at build time. This effectively removes support for
 * v1 caches.
 *
 * ```js
 * let app = new EmberApp(defaults, {
 *   emberData: {
 *     useSingletonManager: true
 *   },
 * });
 * ```
 *
 * @class CacheManager
 * @public
 */
export class NonSingletonCacheManager implements Cache {
  version: '2' = '2';

  #store: Store;
  #cache: Cache | CacheV1;
  #identifier: StableRecordIdentifier;

  get managedVersion() {
    return this.#cache.version || '1';
  }

  constructor(store: Store, cache: Cache | CacheV1, identifier: StableRecordIdentifier) {
    this.#store = store;
    this.#cache = cache;
    this.#identifier = identifier;

    if (this.#isDeprecated(cache)) {
      deprecate(
        `This RecordData uses the deprecated V1 RecordData Spec. Upgrade to V2 to maintain compatibility.`,
        false,
        {
          id: 'ember-data:deprecate-v1-cache',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
          for: 'ember-data',
        }
      );
    }
  }

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
   * a `data` member and therefor must not assume the existence
   * of `request` and `response` on the document.
   *
   * @method put
   * @param {StructuredDocument} doc
   * @returns {ResourceDocument}
   * @public
   */
  put<T>(doc: StructuredDocument<T> | { data: T }): ResourceDocument {
    const cache = this.#cache;
    if (this.#isDeprecated(cache)) {
      if (doc instanceof Error) {
        // in legacy we don't know how to handle this
        throw doc;
      }
      return legacyCachePut(this.#store, doc as StructuredDataDocument<JsonApiDocument>);
    }
    return cache.put(doc);
  }

  #isDeprecated(cache: Cache | CacheV1): cache is CacheV1 {
    let version = cache.version || '1';
    return version !== this.version;
  }

  // Cache
  // =====

  /**
   * Retrieve the identifier for this v1 cache
   *
   * DEPRECATED Caches should not be assumed to be 1:1 with resources
   *
   * @method getResourceIdentifier
   * @public
   * @deprecated
   */
  getResourceIdentifier(): StableRecordIdentifier {
    return this.#identifier;
  }

  /**
   * Push resource data from a remote source into the cache for this identifier
   *
   * DEPRECATED Use upsert. Caches should not be assumed to be 1:1 with resources
   *
   * @method pushData
   * @param data
   * @param hasRecord
   * @returns {void | string[]} if `hasRecord` is true then calculated key changes should be returned
   * @public
   * @deprecated
   */
  pushData(data: JsonApiResource, hasRecord?: boolean): void | string[] {
    return this.upsert(this.#identifier, data, hasRecord);
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
  upsert(identifier: StableRecordIdentifier, data: JsonApiResource, hasRecord?: boolean): void | string[] {
    const cache = this.#cache;
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      data = identifier as JsonApiResource;
      hasRecord = data as unknown as boolean;
      identifier = this.#identifier;
    }
    if (this.#isDeprecated(cache)) {
      return cache.pushData(data, hasRecord);
    }
    return cache.upsert(identifier, data, hasRecord);
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
    const cache = this.#cache;
    if (this.#isDeprecated(cache)) {
      return;
    }
    cache.patch(op);
  }

  /**
   * Update resource data with a local mutation. Currently supports operations
   * on relationships only.
   *
   * @method update
   * @public
   * @param operation
   */
  // isCollection is only needed for interop with v1 cache
  update(operation: LocalRelationshipOperation, isResource?: boolean): void {
    if (this.#isDeprecated(this.#cache)) {
      const cache = this.#store._instanceCache;
      switch (operation.op) {
        case 'addToRelatedRecords':
          this.#cache.addToHasMany(
            operation.field,
            (operation.value as StableRecordIdentifier[]).map((i) => cache.getResourceCache(i)),
            operation.index
          );
          return;
        case 'removeFromRelatedRecords':
          this.#cache.removeFromHasMany(
            operation.field,
            (operation.value as StableRecordIdentifier[]).map((i) => cache.getResourceCache(i))
          );
          return;
        case 'replaceRelatedRecords':
          this.#cache.setDirtyHasMany(
            operation.field,
            operation.value.map((i) => cache.getResourceCache(i))
          );
          return;
        case 'replaceRelatedRecord':
          if (isResource) {
            this.#cache.setDirtyBelongsTo(
              operation.field,
              operation.value ? cache.getResourceCache(operation.value) : null
            );
            return;
          }
          this.#cache.removeFromHasMany(operation.field, [cache.getResourceCache(operation.prior!)]);
          this.#cache.addToHasMany(operation.field, [cache.getResourceCache(operation.value!)], operation.index);
          return;
        case 'sortRelatedRecords':
          return;
        default:
          return;
      }
    } else {
      this.#cache.update(operation);
    }
  }

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
  clientDidCreate(identifier: StableRecordIdentifier, options?: Dict<unknown>): Dict<unknown> {
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      options = identifier;
      identifier = this.#identifier;
    }
    const cache = this.#cache;

    // TODO deprecate return value
    if (this.#isDeprecated(cache)) {
      cache.clientDidCreate();
      // if a V2 is calling a V1 we need to call both methods
      return cache._initRecordCreateOptions(options);
    } else {
      return cache.clientDidCreate(identifier, options);
    }
  }

  /**
   * Pass options to the cache that were supplied to a new record
   * instantiated on the client.
   *
   * DEPRECATED: options are now passed via `clientDidCreate`
   *
   * @method clientDidCreate
   * @public
   * @deprecated
   * @param options
   */
  _initRecordCreateOptions(options?: Dict<unknown>) {
    const cache = this.#cache;

    if (this.#isDeprecated(cache)) {
      return cache._initRecordCreateOptions(options);
    }
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @method willCommit
   * @public
   * @param identifier
   */
  willCommit(identifier: StableRecordIdentifier): void {
    this.#cache.willCommit(identifier || this.#identifier);
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
  didCommit(identifier: StableRecordIdentifier, data: JsonApiResource | null): void {
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      data = identifier;
      identifier = this.#identifier;
    }
    const cache = this.#cache;
    this.#isDeprecated(cache) ? cache.didCommit(data) : cache.didCommit(identifier, data);
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
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[]) {
    this.#cache.commitWasRejected(identifier || this.#identifier, errors);
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
    const cache = this.#cache;
    if (this.#isDeprecated(cache)) {
      cache.unloadRecord();
    } else {
      cache.unloadRecord(identifier || this.#identifier);
    }
  }

  // Attrs
  // =====

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
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      propertyName = identifier;
      identifier = this.#identifier;
    }
    const cache = this.#cache;
    return this.#isDeprecated(cache) ? cache.getAttr(propertyName) : cache.getAttr(identifier, propertyName);
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
    const cache = this.#cache;

    this.#isDeprecated(cache)
      ? cache.setDirtyAttribute(propertyName, value)
      : cache.setAttr(identifier, propertyName, value);
  }

  /**
   * Mutate the data for an attribute in the cache
   *
   * DEPRECATED use setAttr
   *
   * @method setDirtyAttribute
   * @public
   * @deprecated
   * @param identifier
   * @param propertyName
   * @param value
   */
  setDirtyAttribute(propertyName: string, value: unknown): void {
    const cache = this.#cache;

    this.#isDeprecated(cache)
      ? cache.setDirtyAttribute(propertyName, value)
      : cache.setAttr(this.#identifier, propertyName, value);
  }

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * DEPRECATED use changedAttrs
   *
   * @method changedAttributes
   * @public
   * @deprecated
   * @param identifier
   * @returns
   */
  changedAttributes(): ChangedAttributesHash {
    const cache = this.#cache;
    if (this.#isDeprecated(cache)) {
      return cache.changedAttributes();
    }
    return cache.changedAttrs(this.#identifier);
  }

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * @method changedAttrs
   * @public
   * @deprecated
   * @param identifier
   * @returns
   */
  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash {
    const cache = this.#cache;
    if (this.#isDeprecated(cache)) {
      return cache.changedAttributes();
    }
    return cache.changedAttrs(identifier);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * DEPRECATED use hasChangedAttrs
   *
   * @method hasChangedAttributes
   * @public
   * @deprecated
   * @returns {boolean}
   */
  hasChangedAttributes(): boolean {
    const cache = this.#cache;
    return this.#isDeprecated(cache) ? cache.hasChangedAttributes() : cache.hasChangedAttrs(this.#identifier);
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
    const cache = this.#cache;
    return this.#isDeprecated(cache) ? cache.hasChangedAttributes() : cache.hasChangedAttrs(identifier);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * DEPRECATED use rollbackAttrs
   *
   * @method rollbackAttributes
   * @public
   * @deprecated
   * @returns
   */
  rollbackAttributes() {
    const cache = this.#cache;
    return this.#isDeprecated(cache) ? cache.rollbackAttributes() : cache.rollbackAttrs(this.#identifier);
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
    const cache = this.#cache;
    return this.#isDeprecated(cache) ? cache.rollbackAttributes() : cache.rollbackAttrs(identifier);
  }

  // Relationships
  // =============

  // the third arg here is "private". In a world with only V2 it is not necessary
  // but in one in which we must convert a call from V2 -> V1 it is required to do this
  // or else to do nasty schema lookup things
  // @runspired has implemented this concept in relationships spikes and is confident
  // we do not need any signal about whether a relationship is a collection or not at this
  // boundary
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
    propertyName: string,
    isCollection = false
  ): SingleResourceRelationship | CollectionResourceRelationship {
    const cache = this.#cache;

    if (this.#isDeprecated(cache)) {
      let isBelongsTo = !isCollection;
      return isBelongsTo ? cache.getBelongsTo(propertyName) : cache.getHasMany(propertyName);
    }

    return cache.getRelationship(identifier, propertyName);
  }

  /**
   * Query the cache for the current state of a belongsTo field
   *
   * DEPRECATED use `getRelationship`
   *
   * @method getBelongsTo
   * @public
   * @deprecated
   * @param propertyName
   * @returns single resource relationship object
   */
  getBelongsTo(propertyName: string): SingleResourceRelationship {
    const cache = this.#cache;

    if (this.#isDeprecated(cache)) {
      return cache.getBelongsTo(propertyName);
    } else {
      let identifier = this.#identifier;
      return cache.getRelationship(identifier, propertyName) as SingleResourceRelationship;
    }
  }

  /**
   * Query the cache for the current state of a hasMany field
   *
   * DEPRECATED use `getRelationship`
   *
   * @method getHasMany
   * @public
   * @deprecated
   * @param propertyName
   * @returns single resource relationship object
   */
  getHasMany(propertyName: string): CollectionResourceRelationship {
    const cache = this.#cache;

    if (this.#isDeprecated(cache)) {
      return cache.getHasMany(propertyName);
    } else {
      let identifier = this.#identifier;
      return cache.getRelationship(identifier, propertyName) as CollectionResourceRelationship;
    }
  }

  /**
   * Mutate the current state of a belongsTo relationship
   *
   * DEPRECATED use update
   *
   * @method setDirtyBelongsTo
   * @public
   * @deprecated
   * @param propertyName
   * @param value
   */
  setDirtyBelongsTo(propertyName: string, value: NonSingletonCacheManager | null) {
    const cache = this.#cache;

    this.#isDeprecated(cache)
      ? cache.setDirtyBelongsTo(propertyName, value)
      : cache.update({
          op: 'replaceRelatedRecord',
          record: this.#identifier,
          field: propertyName,
          value: value ? value.getResourceIdentifier() : null,
        });
  }

  /**
   * Mutate the current state of a hasMany relationship by adding values
   * An index may optionally be specified which the cache should use for
   * where in the list to insert the records
   *
   * DEPRECATED use update
   *
   * @method addToHasMany
   * @deprecated
   * @public
   * @param propertyName
   * @param value
   * @param idx
   */
  addToHasMany(propertyName: string, value: NonSingletonCacheManager[], idx?: number): void {
    const identifier = this.#identifier;
    const cache = this.#cache;

    this.#isDeprecated(cache)
      ? cache.addToHasMany(propertyName, value, idx)
      : cache.update({
          op: 'addToRelatedRecords',
          field: propertyName,
          record: identifier,
          value: value.map((v) => v.getResourceIdentifier()),
        });
  }

  /**
   * Mutate the current state of a hasMany relationship by removing values.
   *
   * DEPRECATED use update
   *
   * @method removeFromHasMany
   * @deprecated
   * @public
   * @param propertyName
   * @param value
   */
  removeFromHasMany(propertyName: string, value: Cache[]): void {
    const identifier = this.#identifier;
    const cache = this.#cache;

    this.#isDeprecated(cache)
      ? cache.removeFromHasMany(propertyName, value)
      : cache.update({
          op: 'removeFromRelatedRecords',
          record: identifier,
          field: propertyName,
          value: (value as unknown as NonSingletonCacheManager[]).map((v) => v.getResourceIdentifier()),
        });
  }

  /**
   * Mutate the current state of a hasMany relationship by replacing it entirely
   *
   * DEPRECATED use `setHasMany`
   *
   * @method setDirtyHasMany
   * @public
   * @deprecated
   * @param propertyName
   * @param value
   */
  setDirtyHasMany(propertyName: string, value: NonSingletonCacheManager[]) {
    const cache = this.#cache;

    this.#isDeprecated(cache)
      ? cache.setDirtyHasMany(propertyName, value)
      : cache.update({
          op: 'replaceRelatedRecords',
          record: this.#identifier,
          field: propertyName,
          value: value.map((rd) => rd.getResourceIdentifier()),
        });
  }

  // State
  // =============

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
    if (!isStableIdentifier(identifier)) {
      isDeleted = identifier as boolean;
      identifier = this.#identifier;
    }
    const cache = this.#cache;
    this.#isDeprecated(cache) ? cache.setIsDeleted(isDeleted) : cache.setIsDeleted(identifier, isDeleted);
  }

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @method getErrors
   * @public
   * @param identifier
   * @returns
   */
  getErrors(identifier: StableRecordIdentifier): JsonApiValidationError[] {
    return this.#cache.getErrors(identifier || this.#identifier);
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
    const cache = this.#cache;
    return this.#isDeprecated(cache)
      ? cache.isEmpty?.(identifier || this.#identifier) || false
      : cache.isEmpty(identifier || this.#identifier);
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
    return this.#cache.isNew(identifier || this.#identifier);
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
    return this.#cache.isDeleted(identifier || this.#identifier);
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
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isDeletionCommitted(identifier || this.#identifier);
  }
}

export class SingletonCacheManager implements Cache {
  version: '2' = '2';

  #cache: Cache;

  constructor(cache: Cache) {
    this.#cache = cache;
  }

  put<T>(doc: StructuredDocument<T>): ResourceDocument {
    return this.#cache.put(doc);
  }

  // Cache
  // =====

  upsert(identifier: StableRecordIdentifier, data: JsonApiResource, hasRecord?: boolean): void | string[] {
    return this.#cache.upsert(identifier, data, hasRecord);
  }

  patch(op: MergeOperation): void {
    this.#cache.patch(op);
  }

  clientDidCreate(identifier: StableRecordIdentifier, options?: Dict<unknown>): Dict<unknown> {
    return this.#cache.clientDidCreate(identifier, options);
  }

  willCommit(identifier: StableRecordIdentifier): void {
    this.#cache.willCommit(identifier);
  }

  didCommit(identifier: StableRecordIdentifier, data: JsonApiResource | null): void {
    this.#cache.didCommit(identifier, data);
  }

  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[]): void {
    this.#cache.commitWasRejected(identifier, errors);
  }

  unloadRecord(identifier: StableRecordIdentifier): void {
    this.#cache.unloadRecord(identifier);
  }

  // Attrs
  // =====

  getAttr(identifier: StableRecordIdentifier, propertyName: string): unknown {
    return this.#cache.getAttr(identifier, propertyName);
  }

  setAttr(identifier: StableRecordIdentifier, propertyName: string, value: unknown): void {
    this.#cache.setAttr(identifier, propertyName, value);
  }

  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash {
    return this.#cache.changedAttrs(identifier);
  }

  hasChangedAttrs(identifier: StableRecordIdentifier): boolean {
    return this.#cache.hasChangedAttrs(identifier);
  }

  rollbackAttrs(identifier: StableRecordIdentifier): string[] {
    return this.#cache.rollbackAttrs(identifier);
  }

  getRelationship(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): SingleResourceRelationship | CollectionResourceRelationship {
    return this.#cache.getRelationship(identifier, propertyName);
  }
  update(operation: LocalRelationshipOperation): void {
    this.#cache.update(operation);
  }

  // State
  // =============

  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void {
    this.#cache.setIsDeleted(identifier, isDeleted);
  }

  getErrors(identifier: StableRecordIdentifier): JsonApiValidationError[] {
    return this.#cache.getErrors(identifier);
  }

  isEmpty(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isEmpty(identifier);
  }

  isNew(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isNew(identifier);
  }

  isDeleted(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isDeleted(identifier);
  }

  isDeletionCommitted(identifier: StableRecordIdentifier): boolean {
    return this.#cache.isDeletionCommitted(identifier);
  }
}
