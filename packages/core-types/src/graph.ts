import type {
  AddToResourceRelationshipMutation as AddResourceMutation,
  RemoveFromResourceRelationshipMutation as RemoveResourceMutation,
} from './cache/mutations';
import type {
  AddToResourceRelationshipOperation as AddResourceOperation,
  RemoveFromResourceRelationshipOperation as RemoveResourceOperation,
  UpdateResourceRelationshipOperation,
} from './cache/operations';
import type { CollectionRelationship, ResourceRelationship } from './cache/relationship';
import type { ResourceCacheKey } from './identifier';
import type { CollectionResourceRelationship, SingleResourceRelationship } from './spec/json-api-raw';

export interface Graph {
  identifiers: Map<ResourceCacheKey, unknown>;

  getData(identifier: ResourceCacheKey, field: string): ResourceRelationship | CollectionRelationship;

  remove(identifier: ResourceCacheKey): void;
  registerPolymorphicType(abstract: string, concrete: string): void;
  destroy(): void;
}

export interface Operation {
  op: string;
}

export interface UpdateRelationshipOperation {
  op: 'updateRelationship';
  record: ResourceCacheKey;
  field: string;
  value: SingleResourceRelationship | CollectionResourceRelationship;
}

export interface DeleteRecordOperation {
  op: 'deleteRecord';
  record: ResourceCacheKey;
  isNew: boolean;
}

export interface UnknownOperation {
  op: 'never';
  record: ResourceCacheKey;
  field: string;
}

export interface ReplaceRelatedRecordOperation {
  op: 'replaceRelatedRecord';
  record: ResourceCacheKey;
  field: string;
  value: ResourceCacheKey | null; // never null if field is a collection
  prior?: ResourceCacheKey; // if field is a collection, the value we are swapping with
  index?: number; // if field is a collection, the index at which we are replacing a value
}

export interface SortRelatedRecords {
  op: 'sortRelatedRecords';
  record: ResourceCacheKey;
  field: string;
  value: ResourceCacheKey[];
}

export interface ReplaceRelatedRecordsOperation {
  op: 'replaceRelatedRecords';
  record: ResourceCacheKey;
  field: string;
  value: ResourceCacheKey[]; // the records to add. If no prior/index specified all existing should be removed
  prior?: ResourceCacheKey[]; // if this is a "splice" the records we expect to be removed
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
