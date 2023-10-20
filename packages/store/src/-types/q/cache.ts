import type { RecordIdentifier, StableRecordIdentifier } from '@warp-drive/core/identifier';

import { Cache } from '../cache/cache';
import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { JsonApiError, JsonApiResource } from './record-data-json-api';
/**
  @module @ember-data/store
*/

/**
 * A hash of changed attributes with the key being the attribute name and the value being an
 * array of `[oldValue, newValue]`.
 *
 * @internal
 */
export type ChangedAttributesHash = Record<string, [unknown, unknown]>;

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
  commitWasRejected(recordIdentifier?: RecordIdentifier, errors?: JsonApiError[]): void;

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
  getErrors(identifier: StableRecordIdentifier): JsonApiError[];
  isEmpty?(identifier: StableRecordIdentifier): boolean; // needs rfc
  isNew(identifier: StableRecordIdentifier): boolean;
  isDeleted(identifier: StableRecordIdentifier): boolean;
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean;
}

export { Cache };
