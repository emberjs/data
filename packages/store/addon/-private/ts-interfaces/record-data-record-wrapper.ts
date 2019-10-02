import { JsonApiValidationError } from './record-data-json-api';
import { SingleResourceRelationship, CollectionResourceRelationship } from './ember-data-json-api';
import { RecordIdentifier } from './identifier';
import { ChangedAttributesHash } from './record-data';

/**
  @module @ember-data/store
*/

export default interface RecordDataRecordWrapper {
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
  removeFromInverseRelationships(isNew: boolean): void;
  hasAttr(key: string): boolean;

  // new
  getErrors?(recordIdentifier: RecordIdentifier): JsonApiValidationError[];
  /**
   * @deprecated
   */
  getErrors?({}): JsonApiValidationError[]; // eslint-disable-line no-empty-pattern

  isNew?(): boolean;
  isDeleted?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;
}
