import type { RequestCacheKey, ExistingResourceCacheKey, ResourceCacheKey } from '../identifier';
import type { Value } from '../json/raw';
import type { ExistingResourceObject } from '../spec/json-api-raw';
import type { Relationship } from './relationship';

export interface Op {
  op: string;
}

// Occasionally the IdentifierCache
// discovers that two previously thought
// to be distinct Identifiers refer to
// the same ResourceBlob. This Operation
// will be performed giving the Cache the
// change to cleanup and merge internal
// state as desired when this discovery
// is made.
export interface MergeOperation extends Op {
  op: 'mergeIdentifiers';
  // existing
  record: ResourceCacheKey;
  // new
  value: ResourceCacheKey;
}

export interface RemoveDocumentOperation extends Op {
  op: 'remove';
  record: RequestCacheKey;
}

export interface RemoveResourceOperation extends Op {
  op: 'remove';
  record: ExistingResourceCacheKey;
}

export interface AddResourceOperation extends Op {
  op: 'add';
  record: ExistingResourceCacheKey;
  value: ExistingResourceObject;
}

export interface UpdateResourceOperation extends Op {
  op: 'update';
  record: ExistingResourceCacheKey;
  value: ExistingResourceObject;
}

export interface UpdateResourceFieldOperation extends Op {
  op: 'update';
  record: ExistingResourceCacheKey;
  field: string;
  value: Value;
}

export interface UpdateResourceRelationshipOperation extends Op {
  op: 'update';
  record: ExistingResourceCacheKey;
  field: string;
  value: Relationship<ExistingResourceCacheKey>;
}

export interface AddToDocumentOperation extends Op {
  op: 'add';
  record: RequestCacheKey;
  field: 'data' | 'included';
  value: ExistingResourceCacheKey | ExistingResourceCacheKey[];
  index?: number;
}
export interface AddToResourceRelationshipOperation extends Op {
  op: 'add';
  record: ExistingResourceCacheKey;
  field: string;
  value: ExistingResourceCacheKey | ExistingResourceCacheKey[];
  index?: number;
}

export interface RemoveFromResourceRelationshipOperation extends Op {
  op: 'remove';
  record: ExistingResourceCacheKey;
  field: string;
  value: ExistingResourceCacheKey | ExistingResourceCacheKey[];
  index?: number;
}

export interface RemoveFromDocumentOperation extends Op {
  op: 'remove';
  record: RequestCacheKey;
  field: 'data' | 'included';
  value: ExistingResourceCacheKey | ExistingResourceCacheKey[];
  index?: number;
}

// An Operation is an action that updates
// the remote state of the Cache in some
// manner. Additional Operations will be
// added in the future.
export type Operation =
  | MergeOperation
  | RemoveResourceOperation
  | RemoveDocumentOperation
  | AddResourceOperation
  | UpdateResourceOperation
  | UpdateResourceFieldOperation
  | AddToResourceRelationshipOperation
  | RemoveFromResourceRelationshipOperation
  | AddToDocumentOperation
  | RemoveFromDocumentOperation;
