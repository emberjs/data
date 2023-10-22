import type { Cache, ChangedAttributesHash } from '@warp-drive/core-types/cache';
import type { RecordIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { ApiError } from '@warp-drive/core-types/spec/error';
import type { CollectionResourceRelationship, SingleResourceRelationship } from '@warp-drive/core-types/spec/raw';

import type { JsonApiResource } from './record-data-json-api';
/**
  @module @ember-data/store
*/

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
  _initRecordCreateOptions(options?: Record<string, unknown>): Record<string, unknown>;

  willCommit(): void;
  didCommit(data: JsonApiResource | null): void;
  commitWasRejected(recordIdentifier?: RecordIdentifier, errors?: ApiError[]): void;

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
  getErrors(identifier: StableRecordIdentifier): ApiError[];
  isEmpty?(identifier: StableRecordIdentifier): boolean; // needs rfc
  isNew(identifier: StableRecordIdentifier): boolean;
  isDeleted(identifier: StableRecordIdentifier): boolean;
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean;
}

export { Cache };
