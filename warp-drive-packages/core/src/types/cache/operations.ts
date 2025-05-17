import type {
  StableDocumentIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '../identifier.ts';
import type { Value } from '../json/raw.ts';
import type { ExistingResourceObject } from '../spec/json-api-raw.ts';
import type { Relationship } from './relationship.ts';

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
  record: StableRecordIdentifier;
  // new
  value: StableRecordIdentifier;
}

export interface RemoveDocumentOperation extends Op {
  op: 'remove';
  record: StableDocumentIdentifier;
}

export interface RemoveResourceOperation extends Op {
  op: 'remove';
  record: StableExistingRecordIdentifier;
}

export interface AddResourceOperation extends Op {
  op: 'add';
  record: StableExistingRecordIdentifier;
  value: ExistingResourceObject;
}

export interface UpdateResourceOperation extends Op {
  op: 'update';
  record: StableExistingRecordIdentifier;
  value: ExistingResourceObject;
}

export interface UpdateResourceFieldOperation extends Op {
  op: 'update';
  record: StableExistingRecordIdentifier;
  field: string;
  value: Value;
}

export interface UpdateResourceRelationshipOperation extends Op {
  op: 'update';
  record: StableExistingRecordIdentifier;
  field: string;
  value: Relationship<StableExistingRecordIdentifier>;
}

export interface AddToDocumentOperation extends Op {
  op: 'add';
  record: StableDocumentIdentifier;
  field: 'data' | 'included';
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
  index?: number;
}
export interface AddToResourceRelationshipOperation extends Op {
  op: 'add';
  record: StableExistingRecordIdentifier;
  field: string;
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
  index?: number;
}

export interface RemoveFromResourceRelationshipOperation extends Op {
  op: 'remove';
  record: StableExistingRecordIdentifier;
  field: string;
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
  index?: number;
}

export interface RemoveFromDocumentOperation extends Op {
  op: 'remove';
  record: StableDocumentIdentifier;
  field: 'data' | 'included';
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
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
