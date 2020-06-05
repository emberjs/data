type ChangedAttributesHash = import('./record-data').ChangedAttributesHash;
type RecordIdentifier = import('./identifier').RecordIdentifier;
type SingleResourceRelationship = import('./ember-data-json-api').SingleResourceRelationship;
type CollectionResourceRelationship = import('./ember-data-json-api').CollectionResourceRelationship;
type JsonApiValidationError = import('./record-data-json-api').JsonApiValidationError;

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
