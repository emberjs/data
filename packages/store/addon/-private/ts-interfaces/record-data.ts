import {
  JsonApiResource,
  JsonApiHasManyRelationship,
  JsonApiBelongsToRelationship,
  JsonApiValidationError,
} from './record-data-json-api';
import { RecordIdentifier } from './identifier';

/**
  @module @ember-data/store
*/

export interface ChangedAttributesHash {
  [key: string]: [string, string];
}

export default interface RecordDataV1 {
  version?: '1';
  pushData(data: JsonApiResource, calculateChange?: boolean): void;
  clientDidCreate(): void;
  willCommit(): void;

  commitWasRejected(recordIdentifier?: RecordIdentifier, errors?: JsonApiValidationError[]): void;
  /**
   * @deprecated
   */
  commitWasRejected(recordIdentifier?: {}, errors?: JsonApiValidationError[]): void;

  unloadRecord(): void;
  rollbackAttributes(): string[];
  changedAttributes(): ChangedAttributesHash;
  hasChangedAttributes(): boolean;
  setDirtyAttribute(key: string, value: any): void;

  getAttr(key: string): any;
  getHasMany(key: string): JsonApiHasManyRelationship;

  addToHasMany(key: string, recordDatas: RecordData[], idx?: number): void;
  removeFromHasMany(key: string, recordDatas: RecordData[]): void;
  setDirtyHasMany(key: string, recordDatas: RecordData[]): void;

  getBelongsTo(key: string): JsonApiBelongsToRelationship;

  setDirtyBelongsTo(name: string, recordData: RecordData | null): void;
  didCommit(data: JsonApiResource | null): void;

  // ----- unspecced
  isAttrDirty(key: string): boolean;
  removeFromInverseRelationships(isNew: boolean): void;
  hasAttr(key: string): boolean;

  isRecordInUse(): boolean;
  _initRecordCreateOptions(options: any): { [key: string]: unknown };

  // new
  getErrors?(recordIdentifier: RecordIdentifier): JsonApiValidationError[];
  /**
   * @deprecated
   */
  getErrors?({}): JsonApiValidationError[];

  isNew?(): boolean;
  isDeleted?(): boolean;

  isDeletionCommitted?(): boolean;

  setIsDeleted?(isDeleted: boolean): void;
}

export interface RecordDataV2 {
  version: '2';
  pushData(data: object, calculateChanges: boolean);
  unloadRecord(identifier: RecordIdentifier);
  isRecordInUse(identifier: RecordIdentifier);
  getAttr(identifier: RecordIdentifier, propertyName: string);
  isAttrDirty(identifier: RecordIdentifier, propertyName: string);
  changedAttributes(identifier: RecordIdentifier);
  hasChangedAttributes(identifier: RecordIdentifier);
  rollbackAttributes(identifier: RecordIdentifier);
  getRelationship(identifier: RecordIdentifier, propertyName: string);
  willCommit(identifier: RecordIdentifier);
  didCommit(identifier: RecordIdentifier, data: any);
  commitWasRejected(identifier: RecordIdentifier);
  isEmpty(identifier: RecordIdentifier);
  isNew(identifier: RecordIdentifier);
  clientDidCreate(identifier: RecordIdentifier, options: object);
  setBelongsTo(identifier: RecordIdentifier, propertyName: string, value: RecordIdentifier | null);
  removeFromInverseRelationships(identifier: RecordIdentifier, isNew: boolean);
  setAttribute(identifier: RecordIdentifier, propertyName: string, value: any);
  addToHasMany(identifier: RecordIdentifier, propertyName: string, value: RecordIdentifier[]);
  removeFromHasMany(identifier: RecordIdentifier, propertyName: string, value: RecordIdentifier[]);
  setHasMany(identifier: RecordIdentifier, propertyName: string, value: RecordIdentifier[]);
}

export interface EmberDataRecordData extends RecordDataV1 {
  _relationships: object;
}

export type RecordData = RecordDataV1 | RecordDataV2 | EmberDataRecordData;
