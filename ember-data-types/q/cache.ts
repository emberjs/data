import { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';

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

export interface Cache {
  version: '2';

  // Cache
  // =====

  pushData(identifier: StableRecordIdentifier, data: JsonApiResource, calculateChanges?: boolean): void | string[];
  clientDidCreate(identifier: StableRecordIdentifier, options?: Dict<unknown>): Dict<unknown>;

  willCommit(identifier: StableRecordIdentifier): void;
  didCommit(identifier: StableRecordIdentifier, data: JsonApiResource | null): void;
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[]): void;

  unloadRecord(identifier: StableRecordIdentifier): void;
  sync(op: MergeOperation): void;

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
