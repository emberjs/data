import { assert, deprecate } from '@ember/debug';

import type { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';
import type { Cache, CacheV1, ChangedAttributesHash, MergeOperation } from '@ember-data/types/q/cache';
import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource, JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';
import type { Dict } from '@ember-data/types/q/utils';

import { isStableIdentifier } from '../caches/identifier-cache';
import type Store from '../store-service';

/**
 * The CacheManager wraps a Cache
 * enforcing that only the public API surface area
 * is exposed.
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
  #recordData: Cache | CacheV1;
  #identifier: StableRecordIdentifier;

  get managedVersion() {
    return this.#recordData.version || '1';
  }

  constructor(store: Store, recordData: Cache | CacheV1, identifier: StableRecordIdentifier) {
    this.#store = store;
    this.#recordData = recordData;
    this.#identifier = identifier;

    if (this.#isDeprecated(recordData)) {
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

  #isDeprecated(recordData: Cache | CacheV1): recordData is CacheV1 {
    let version = recordData.version || '1';
    return version !== this.version;
  }

  // Cache
  // =====

  /**
   * Retrieve the identifier for this v1 recordData
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
   * @method pushData
   * @public
   * @param identifier
   * @param data
   * @param hasRecord
   * @returns {void | string[]} if `hasRecord` is true then calculated key changes should be returned
   */
  pushData(identifier: StableRecordIdentifier, data: JsonApiResource, hasRecord?: boolean): void | string[] {
    const recordData = this.#recordData;
    // called by something V1
    if (!isStableIdentifier(identifier)) {
      data = identifier as JsonApiResource;
      hasRecord = data as unknown as boolean;
      identifier = this.#identifier;
    }
    if (this.#isDeprecated(recordData)) {
      return recordData.pushData(data, hasRecord);
    }
    return recordData.pushData(identifier, data, hasRecord);
  }

  /**
   * Perform an operation on the cache to update the remote state.
   *
   * Note: currently the only valid operation is a MergeOperation
   * which occurs when a collision of identifiers is detected.
   *
   * @method sync
   * @public
   * @param op the operation to perform
   * @returns {void}
   */
  sync(op: MergeOperation): void {
    const recordData = this.#recordData;
    if (this.#isDeprecated(recordData)) {
      return;
    }
    recordData.sync(op);
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
    if (this.#isDeprecated(this.#recordData)) {
      const cache = this.#store._instanceCache;
      switch (operation.op) {
        case 'addToRelatedRecords':
          this.#recordData.addToHasMany(
            operation.field,
            (operation.value as StableRecordIdentifier[]).map((i) => cache.getRecordData(i)),
            operation.index
          );
          return;
        case 'removeFromRelatedRecords':
          this.#recordData.removeFromHasMany(
            operation.field,
            (operation.value as StableRecordIdentifier[]).map((i) => cache.getRecordData(i))
          );
          return;
        case 'replaceRelatedRecords':
          this.#recordData.setDirtyHasMany(
            operation.field,
            operation.value.map((i) => cache.getRecordData(i))
          );
          return;
        case 'replaceRelatedRecord':
          if (isResource) {
            this.#recordData.setDirtyBelongsTo(
              operation.field,
              operation.value ? cache.getRecordData(operation.value) : null
            );
            return;
          }
          this.#recordData.removeFromHasMany(operation.field, [cache.getRecordData(operation.prior!)]);
          this.#recordData.addToHasMany(operation.field, [cache.getRecordData(operation.value!)], operation.index);
          return;
        case 'sortRelatedRecords':
          return;
        default:
          return;
      }
    } else {
      this.#recordData.update(operation);
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
    let recordData = this.#recordData;

    // TODO deprecate return value
    if (this.#isDeprecated(recordData)) {
      recordData.clientDidCreate();
      // if a V2 is calling a V1 we need to call both methods
      return recordData._initRecordCreateOptions(options);
    } else {
      return recordData.clientDidCreate(identifier, options);
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
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      return recordData._initRecordCreateOptions(options);
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
    this.#recordData.willCommit(identifier || this.#identifier);
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
    let recordData = this.#recordData;
    this.#isDeprecated(recordData) ? recordData.didCommit(data) : recordData.didCommit(identifier, data);
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
    this.#recordData.commitWasRejected(identifier || this.#identifier, errors);
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
    const recordData = this.#recordData;
    if (this.#isDeprecated(recordData)) {
      recordData.unloadRecord();
    } else {
      recordData.unloadRecord(identifier || this.#identifier);
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
    let recordData = this.#recordData;
    return this.#isDeprecated(recordData)
      ? recordData.getAttr(propertyName)
      : recordData.getAttr(identifier, propertyName);
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
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyAttribute(propertyName, value)
      : recordData.setAttr(identifier, propertyName, value);
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
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyAttribute(propertyName, value)
      : recordData.setAttr(this.#identifier, propertyName, value);
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
    const recordData = this.#recordData;
    if (this.#isDeprecated(recordData)) {
      return recordData.changedAttributes();
    }
    return recordData.changedAttrs(this.#identifier);
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
    const recordData = this.#recordData;
    if (this.#isDeprecated(recordData)) {
      return recordData.changedAttributes();
    }
    return recordData.changedAttrs(identifier);
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
    const recordData = this.#recordData;
    return this.#isDeprecated(recordData)
      ? recordData.hasChangedAttributes()
      : recordData.hasChangedAttrs(this.#identifier);
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
    const recordData = this.#recordData;
    return this.#isDeprecated(recordData) ? recordData.hasChangedAttributes() : recordData.hasChangedAttrs(identifier);
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
    const recordData = this.#recordData;
    return this.#isDeprecated(recordData)
      ? recordData.rollbackAttributes()
      : recordData.rollbackAttrs(this.#identifier);
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
    const recordData = this.#recordData;
    return this.#isDeprecated(recordData) ? recordData.rollbackAttributes() : recordData.rollbackAttrs(identifier);
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
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      let isBelongsTo = !isCollection;
      return isBelongsTo ? recordData.getBelongsTo(propertyName) : recordData.getHasMany(propertyName);
    }

    return recordData.getRelationship(identifier, propertyName);
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
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      return recordData.getBelongsTo(propertyName);
    } else {
      let identifier = this.#identifier;
      return recordData.getRelationship(identifier, propertyName) as SingleResourceRelationship;
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
    let recordData = this.#recordData;

    if (this.#isDeprecated(recordData)) {
      return recordData.getHasMany(propertyName);
    } else {
      let identifier = this.#identifier;
      return recordData.getRelationship(identifier, propertyName) as CollectionResourceRelationship;
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
    const recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyBelongsTo(propertyName, value)
      : recordData.update({
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
    const recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.addToHasMany(propertyName, value, idx)
      : recordData.update({
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
    const recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.removeFromHasMany(propertyName, value)
      : recordData.update({
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
    let recordData = this.#recordData;

    this.#isDeprecated(recordData)
      ? recordData.setDirtyHasMany(propertyName, value)
      : recordData.update({
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
    const recordData = this.#recordData;
    this.#isDeprecated(recordData)
      ? recordData.setIsDeleted(isDeleted)
      : recordData.setIsDeleted(identifier, isDeleted);
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
    return this.#recordData.getErrors(identifier || this.#identifier);
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
    const recordData = this.#recordData;
    return this.#isDeprecated(recordData)
      ? recordData.isEmpty?.(identifier || this.#identifier) || false
      : recordData.isEmpty(identifier || this.#identifier);
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
    return this.#recordData.isNew(identifier || this.#identifier);
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
    return this.#recordData.isDeleted(identifier || this.#identifier);
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
    return this.#recordData.isDeletionCommitted(identifier || this.#identifier);
  }
}

export class SingletonCacheManager implements Cache {
  version: '2' = '2';

  #recordDatas: Map<StableRecordIdentifier, Cache>;

  constructor() {
    this.#recordDatas = new Map();
  }

  _addRecordData(identifier: StableRecordIdentifier, recordData: Cache) {
    this.#recordDatas.set(identifier, recordData);
  }

  #recordData(identifier: StableRecordIdentifier): Cache {
    assert(`No RecordData Yet Exists!`, this.#recordDatas.has(identifier));
    return this.#recordDatas.get(identifier)!;
  }

  // Cache
  // =====

  pushData(identifier: StableRecordIdentifier, data: JsonApiResource, hasRecord?: boolean): void | string[] {
    return this.#recordData(identifier).pushData(identifier, data, hasRecord);
  }

  sync(op: MergeOperation): void {
    this.#recordData(op.record).sync(op);
  }

  clientDidCreate(identifier: StableRecordIdentifier, options?: Dict<unknown>): Dict<unknown> {
    return this.#recordData(identifier).clientDidCreate(identifier, options);
  }

  willCommit(identifier: StableRecordIdentifier): void {
    this.#recordData(identifier).willCommit(identifier);
  }

  didCommit(identifier: StableRecordIdentifier, data: JsonApiResource | null): void {
    this.#recordData(identifier).didCommit(identifier, data);
  }

  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[]): void {
    this.#recordData(identifier).commitWasRejected(identifier, errors);
  }

  unloadRecord(identifier: StableRecordIdentifier): void {
    this.#recordData(identifier).unloadRecord(identifier);
  }

  // Attrs
  // =====

  getAttr(identifier: StableRecordIdentifier, propertyName: string): unknown {
    return this.#recordData(identifier).getAttr(identifier, propertyName);
  }

  setAttr(identifier: StableRecordIdentifier, propertyName: string, value: unknown): void {
    this.#recordData(identifier).setAttr(identifier, propertyName, value);
  }

  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash {
    return this.#recordData(identifier).changedAttrs(identifier);
  }

  hasChangedAttrs(identifier: StableRecordIdentifier): boolean {
    return this.#recordData(identifier).hasChangedAttrs(identifier);
  }

  rollbackAttrs(identifier: StableRecordIdentifier): string[] {
    return this.#recordData(identifier).rollbackAttrs(identifier);
  }

  getRelationship(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): SingleResourceRelationship | CollectionResourceRelationship {
    return this.#recordData(identifier).getRelationship(identifier, propertyName);
  }
  update(operation: LocalRelationshipOperation): void {
    this.#recordData(operation.record).update(operation);
  }

  // State
  // =============

  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void {
    this.#recordData(identifier).setIsDeleted(identifier, isDeleted);
  }

  getErrors(identifier: StableRecordIdentifier): JsonApiValidationError[] {
    return this.#recordData(identifier).getErrors(identifier);
  }

  isEmpty(identifier: StableRecordIdentifier): boolean {
    return this.#recordData(identifier).isEmpty(identifier);
  }

  isNew(identifier: StableRecordIdentifier): boolean {
    return this.#recordData(identifier).isNew(identifier);
  }

  isDeleted(identifier: StableRecordIdentifier): boolean {
    return this.#recordData(identifier).isDeleted(identifier);
  }

  isDeletionCommitted(identifier: StableRecordIdentifier): boolean {
    return this.#recordData(identifier).isDeletionCommitted(identifier);
  }
}
