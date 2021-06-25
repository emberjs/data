import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';

export interface Operation {
  op: string;
}

export interface UpdateRelationshipOperation {
  op: 'updateRelationship';
  record: StableRecordIdentifier;
  field: string;
  value: SingleResourceRelationship | CollectionResourceRelationship;
}

export interface DeleteRecordOperation {
  op: 'deleteRecord';
  record: StableRecordIdentifier;
  isNew: boolean;
}

export interface UnknownOperation {
  op: 'never';
  record: StableRecordIdentifier;
  field: string;
}

export interface AddToRelatedRecordsOperation {
  op: 'addToRelatedRecords';
  record: StableRecordIdentifier;
  field: string; // "relationship" propertyName
  value: StableRecordIdentifier | StableRecordIdentifier[]; // related record
  index?: number; // the index to insert at
}

export interface RemoveFromRelatedRecordsOperation {
  op: 'removeFromRelatedRecords';
  record: StableRecordIdentifier;
  field: string; // "relationship" propertyName
  value: StableRecordIdentifier | StableRecordIdentifier[]; // related record
}

export interface ReplaceRelatedRecordOperation {
  op: 'replaceRelatedRecord';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier | null;
}

export interface ReplaceRelatedRecordsOperation {
  op: 'replaceRelatedRecords';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier[];
}

export type RemoteRelationshipOperation =
  | UpdateRelationshipOperation
  | ReplaceRelatedRecordOperation
  | ReplaceRelatedRecordsOperation
  | DeleteRecordOperation;

export type LocalRelationshipOperation =
  | ReplaceRelatedRecordsOperation
  | ReplaceRelatedRecordOperation
  | RemoveFromRelatedRecordsOperation
  | AddToRelatedRecordsOperation;
