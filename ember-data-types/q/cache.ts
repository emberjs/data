import { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';

import { ResourceDocument, StructuredDocument } from '../cache/document';
import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { RecordIdentifier, StableRecordIdentifier } from './identifier';
import type { JsonApiResource, JsonApiValidationError } from './record-data-json-api';
import { Dict } from './utils';

/**
  @module @ember-data/store
*/

export interface ChangedAttributesHash {
  [key: string]: [string, string];
}

export interface MergeOperation {
  op: 'mergeIdentifiers';
  record: StableRecordIdentifier; // existing
  value: StableRecordIdentifier; // new
}

export interface CacheV1 {
  version?: '1';

  // Cache
  // =====
  getResourceIdentifier(): RecordIdentifier | undefined;

  pushData(data: JsonApiResource, calculateChange: true): string[];
  pushData(data: JsonApiResource, calculateChange?: false): void;
  pushData(data: JsonApiResource, calculateChange?: boolean): string[] | void;
  clientDidCreate(): void;
  _initRecordCreateOptions(options?: Dict<unknown>): { [key: string]: unknown };

  willCommit(): void;
  didCommit(data: JsonApiResource | null): void;
  commitWasRejected(recordIdentifier?: RecordIdentifier, errors?: JsonApiValidationError[]): void;

  unloadRecord(): void;

  // Attrs
  // =====
  getAttr(key: string): unknown;
  setDirtyAttribute(key: string, value: unknown): void;
  changedAttributes(): ChangedAttributesHash;
  hasChangedAttributes(): boolean;
  rollbackAttributes(): string[];

  // Relationships
  // =============
  getBelongsTo(key: string): SingleResourceRelationship;
  getHasMany(key: string): CollectionResourceRelationship;

  setDirtyBelongsTo(name: string, recordData: Cache | null): void;
  setDirtyHasMany(key: string, recordDatas: Cache[]): void;
  addToHasMany(key: string, recordDatas: Cache[], idx?: number): void;
  removeFromHasMany(key: string, recordDatas: Cache[]): void;

  // State
  // =============
  setIsDeleted(isDeleted: boolean): void;
  getErrors(identifier: StableRecordIdentifier): JsonApiValidationError[];
  isEmpty?(identifier: StableRecordIdentifier): boolean; // needs rfc
  isNew(identifier: StableRecordIdentifier): boolean;
  isDeleted(identifier: StableRecordIdentifier): boolean;
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean;
}

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
   * a `data` member and therefor must not assume the existence
   * of `request` and `response` on the document.
   *
   * @method put
   * @param {StructuredDocument} doc
   * @returns {ResourceDocument}
   * @public
   */
  put(doc: StructuredDocument<unknown>): ResourceDocument;

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
  patch(op: MergeOperation): void;

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
  upsert(identifier: StableRecordIdentifier, data: JsonApiResource, calculateChanges?: boolean): void | string[];
  clientDidCreate(identifier: StableRecordIdentifier, options?: Dict<unknown>): Dict<unknown>;

  willCommit(identifier: StableRecordIdentifier): void;
  didCommit(identifier: StableRecordIdentifier, data: JsonApiResource | null): void;
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[]): void;

  unloadRecord(identifier: StableRecordIdentifier): void;

  // Attrs
  // =====

  getAttr(identifier: StableRecordIdentifier, propertyName: string): unknown;
  setAttr(identifier: StableRecordIdentifier, propertyName: string, value: unknown): void;
  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash;
  hasChangedAttrs(identifier: StableRecordIdentifier): boolean;
  rollbackAttrs(identifier: StableRecordIdentifier): string[];

  // Relationships
  // =============
  getRelationship(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): SingleResourceRelationship | CollectionResourceRelationship;
  update(operation: LocalRelationshipOperation): void;

  // State
  // =============
  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void;
  getErrors(identifier: StableRecordIdentifier): JsonApiValidationError[];
  isEmpty(identifier: StableRecordIdentifier): boolean;
  isNew(identifier: StableRecordIdentifier): boolean;
  isDeleted(identifier: StableRecordIdentifier): boolean;
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean;
}
