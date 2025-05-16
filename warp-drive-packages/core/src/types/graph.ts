import type {
  AddToResourceRelationshipMutation as AddResourceMutation,
  RemoveFromResourceRelationshipMutation as RemoveResourceMutation,
} from './cache/mutations.ts';
import type {
  AddToResourceRelationshipOperation as AddResourceOperation,
  RemoveFromResourceRelationshipOperation as RemoveResourceOperation,
  UpdateResourceRelationshipOperation,
} from './cache/operations.ts';
import type { CollectionRelationship, ResourceRelationship } from './cache/relationship.ts';
import type { StableRecordIdentifier } from './identifier.ts';
import type { CollectionResourceRelationship, SingleResourceRelationship } from './spec/json-api-raw.ts';

export interface Graph {
  identifiers: Map<StableRecordIdentifier, unknown>;

  getData(identifier: StableRecordIdentifier, field: string): ResourceRelationship | CollectionRelationship;

  remove(identifier: StableRecordIdentifier): void;
  registerPolymorphicType(abstract: string, concrete: string): void;
  destroy(): void;
}

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
