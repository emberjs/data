import { StableRecordIdentifier } from '@warp-drive/core-types';

export interface AddToRelatedRecordsMutation {
  op: 'addToRelatedRecords';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier | StableRecordIdentifier[];
  index?: number;
}

export interface RemoveFromRelatedRecordsMutation {
  op: 'removeFromRelatedRecords';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier | StableRecordIdentifier[];
  index?: number;
}

export interface ReplaceRelatedRecordMutation {
  op: 'replaceRelatedRecord';
  record: StableRecordIdentifier;
  field: string;
  // never null if field is a collection
  value: StableRecordIdentifier | null;
  // if field is a collection,
  //  the value we are swapping with
  prior?: StableRecordIdentifier;
  index?: number;
}

export interface ReplaceRelatedRecordsMutation {
  op: 'replaceRelatedRecords';
  record: StableRecordIdentifier;
  field: string;
  // the records to add. If no prior/index
  //  specified all existing should be removed
  value: StableRecordIdentifier[];
  // if this is a "splice" the
  //  records we expect to be removed
  prior?: StableRecordIdentifier[];
  // if this is a "splice" the
  //   index to start from
  index?: number;
}

export interface SortRelatedRecordsMutation {
  op: 'sortRelatedRecords';
  record: StableRecordIdentifier;
  field: string;
  value: StableRecordIdentifier[];
}
// A Mutation is an action that updates
// the local state of the Cache in some
// manner.
// Most Mutations are in theory also
// Operations; with the difference being
// that the change should be applied as
// "local" or "dirty" state instead of
// as "remote" or "clean" state.
//
// Note: this RFC does not publicly surface
// any of the mutations listed here as
// "operations", though the (private) Graph
// already expects and utilizes these.
// and we look forward to an RFC that makes
// the Graph a fully public API.
export type Mutation =
  | ReplaceRelatedRecordsMutation
  | ReplaceRelatedRecordMutation
  | RemoveFromRelatedRecordsMutation
  | AddToRelatedRecordsMutation
  | SortRelatedRecordsMutation;
