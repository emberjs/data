import type {
  AddToResourceRelationshipMutation as AddResourceMutation,
  RemoveFromResourceRelationshipMutation as RemoveResourceMutation,
} from './cache/mutations.ts';
import type {
  AddToResourceRelationshipOperation as AddResourceOperation,
  RemoveFromResourceRelationshipOperation as RemoveResourceOperation,
  UpdateResourceRelationshipOperation,
} from './cache/operations.ts';
import type { ResourceKey } from './identifier.ts';
import type { CollectionResourceRelationship, SingleResourceRelationship } from './spec/json-api-raw.ts';

export interface Operation {
  op: string;
}

export interface UpdateRelationshipOperation {
  op: 'updateRelationship';
  record: ResourceKey;
  field: string;
  value: SingleResourceRelationship | CollectionResourceRelationship;
}

export interface DeleteRecordOperation {
  op: 'deleteRecord';
  record: ResourceKey;
  isNew: boolean;
}

export interface UnknownOperation {
  op: 'never';
  record: ResourceKey;
  field: string;
}

export interface ReplaceRelatedRecordOperation {
  op: 'replaceRelatedRecord';
  record: ResourceKey;
  field: string;
  value: ResourceKey | null; // never null if field is a collection
  prior?: ResourceKey; // if field is a collection, the value we are swapping with
  index?: number; // if field is a collection, the index at which we are replacing a value
}

export interface SortRelatedRecords {
  op: 'sortRelatedRecords';
  record: ResourceKey;
  field: string;
  value: ResourceKey[];
}

export interface ReplaceRelatedRecordsOperation {
  op: 'replaceRelatedRecords';
  record: ResourceKey;
  field: string;
  value: ResourceKey[]; // the records to add. If no prior/index specified all existing should be removed
  prior?: ResourceKey[]; // if this is a "splice" the records we expect to be removed
  index?: number; // if this is a "splice" the index to start from
}

export type RemoteRelationshipOperation =
  | UpdateResourceRelationshipOperation
  | UpdateRelationshipOperation
  | ReplaceRelatedRecordOperation
  | ReplaceRelatedRecordsOperation
  | RemoveResourceOperation
  | AddResourceOperation
  | DeleteRecordOperation
  | SortRelatedRecords;

export type LocalRelationshipOperation =
  | ReplaceRelatedRecordsOperation
  | ReplaceRelatedRecordOperation
  | AddResourceMutation
  | RemoveResourceMutation
  | SortRelatedRecords;
