import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { RecordIdentifier } from './identifier';
import type { ChangedAttributesHash } from './record-data';
import type { JsonApiValidationError } from './record-data-json-api';

/**
  @module @ember-data/store
*/

export interface RecordDataWrapper {
  rollbackAttributes(): string[];
  changedAttributes(): ChangedAttributesHash;
  hasChangedAttributes(): boolean;
  setDirtyAttribute(key: string, value: any): void;

  getAttr(key: string): any;
  getHasMany(key: string): CollectionResourceRelationship;

  addToHasMany(key: string, recordDatas: RecordDataWrapper[], idx?: number): void;
  removeFromHasMany(key: string, recordDatas: RecordDataWrapper[]): void;
  setDirtyHasMany(key: string, recordDatas: RecordDataWrapper[]): void;

  getBelongsTo(key: string): SingleResourceRelationship;

  setDirtyBelongsTo(name: string, recordData: RecordDataWrapper | null): void;

  // new
  getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[];

  isNew?(): boolean;
  isDeleted?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;
}
