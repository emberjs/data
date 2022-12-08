import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

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
  index?: number; // optional the index at which we're expected to start the removal
}

export interface ReplaceRelatedRecordOperation {
  op: 'replaceRelatedRecord';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier | null; // never null if field is a collection
  prior?: StableRecordIdentifier; // if field is a collection, the value we are swapping with
  index?: number; // if field is a collection, the index at which we are replacing a value
}

export interface SortRelatedRecords {
  op: 'sortRelatedRecords';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier[];
}

export interface ReplaceRelatedRecordsOperation {
  op: 'replaceRelatedRecords';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier[]; // the records to add. If no prior/index specified all existing should be removed
  prior?: StableRecordIdentifier[]; // if this is a "splice" the records we expect to be removed
  index?: number; // if this is a "splice" the index to start from
}

export type RemoteRelationshipOperation =
  | UpdateRelationshipOperation
  | ReplaceRelatedRecordOperation
  | ReplaceRelatedRecordsOperation
  | DeleteRecordOperation
  | SortRelatedRecords;

export type LocalRelationshipOperation =
  | ReplaceRelatedRecordsOperation
  | ReplaceRelatedRecordOperation
  | RemoveFromRelatedRecordsOperation
  | AddToRelatedRecordsOperation
  | SortRelatedRecords;
