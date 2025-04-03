import type { StableDocumentIdentifier, StableExistingRecordIdentifier, StableRecordIdentifier } from '../identifier';

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

export interface RemoveOperation extends Op {
  op: 'remove';
  record: StableExistingRecordIdentifier | StableDocumentIdentifier;
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
  | RemoveOperation
  | AddToResourceRelationshipOperation
  | RemoveFromResourceRelationshipOperation
  | AddToDocumentOperation
  | RemoveFromDocumentOperation;
