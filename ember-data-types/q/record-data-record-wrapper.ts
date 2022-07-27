import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { RecordIdentifier } from './identifier';
import type { ChangedAttributesHash } from './record-data';
import type { JsonApiValidationError } from './record-data-json-api';

/**
  @module @ember-data/store
*/

export interface RecordDataRecordWrapper {
  rollbackAttributes(): string[];
  changedAttributes(): ChangedAttributesHash;
  hasChangedAttributes(): boolean;
  setDirtyAttribute(key: string, value: any): void;

  getAttr(key: string): any;
  getHasMany(key: string): CollectionResourceRelationship;

  addToHasMany(key: string, recordDatas: RecordDataRecordWrapper[], idx?: number): void;
  removeFromHasMany(key: string, recordDatas: RecordDataRecordWrapper[]): void;
  setDirtyHasMany(key: string, recordDatas: RecordDataRecordWrapper[]): void;

  getBelongsTo(key: string): SingleResourceRelationship;

  setDirtyBelongsTo(name: string, recordData: RecordDataRecordWrapper | null): void;

  // ----- unspecced
  isAttrDirty(key: string): boolean;
  removeFromInverseRelationships(): void;
  hasAttr(key: string): boolean;

  // new
  getErrors?(recordIdentifier: RecordIdentifier): JsonApiValidationError[];
  /**
   * @internal
   * @deprecated
   */
  getErrors?({}): JsonApiValidationError[]; // eslint-disable-line no-empty-pattern

  isNew?(): boolean;
  isDeleted?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;
}
