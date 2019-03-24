import { RecordIdentifier } from './identifier';
import { ResourceIdentifierObject } from './json-api';

export interface RecordDataV1 {
  version?: '1';
  pushData(data: object, calculateChanges: boolean);
  unloadRecord();
  isRecordInUse();
  getAttr(propertyName: string);
  isAttrDirty(propertyName: string);
  changedAttributes();
  hasChangedAttributes(): boolean;
  rollbackAttributes();
  getBelongsTo(propertyName: string);
  getHasMany(propertyName: string);
  willCommit();
  didCommit(data: any);
  commitWasRejected();
  isEmpty();
  isNew();
  clientDidCreate();
  _initRecordCreateOptions(options: object): object;
  setDirtyBelongsTo(propertyName: string, value: RecordData | null);
  removeFromInverseRelationships(isNew: boolean);
  setDirtyAttribute(propertyName: string, value: any);
  addToHasMany(propertyName: string, value: RecordData[], idx?: number);
  removeFromHasMany(propertyName: string, value: RecordData[]);
  setDirtyHasMany(propertyName: string, value: RecordData[]);
  getHasMany(propertyName: string);
  getResourceIdentifier(): ResourceIdentifierObject;
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
