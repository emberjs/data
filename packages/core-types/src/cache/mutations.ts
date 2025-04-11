import type { ResourceCacheKey } from '../identifier';

export interface AddToResourceRelationshipMutation {
  op: 'add';
  record: ResourceCacheKey;
  field: string;
  value: ResourceCacheKey | ResourceCacheKey[];
  index?: number;
}

export interface RemoveFromResourceRelationshipMutation {
  op: 'remove';
  record: ResourceCacheKey;
  field: string;
  value: ResourceCacheKey | ResourceCacheKey[];
  index?: number;
}

export interface ReplaceRelatedRecordMutation {
  op: 'replaceRelatedRecord';
  record: ResourceCacheKey;
  field: string;
  // never null if field is a collection
  value: ResourceCacheKey | null;
  // if field is a collection,
  //  the value we are swapping with
  prior?: ResourceCacheKey;
  index?: number;
}

export interface ReplaceRelatedRecordsMutation {
  op: 'replaceRelatedRecords';
  record: ResourceCacheKey;
  field: string;
  // the records to add. If no prior/index
  //  specified all existing should be removed
  value: ResourceCacheKey[];
  // if this is a "splice" the
  //  records we expect to be removed
  prior?: ResourceCacheKey[];
  // if this is a "splice" the
  //   index to start from
  index?: number;
}

export interface SortRelatedRecordsMutation {
  op: 'sortRelatedRecords';
  record: ResourceCacheKey;
  field: string;
  value: ResourceCacheKey[];
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
  | RemoveFromResourceRelationshipMutation
  | AddToResourceRelationshipMutation
  | SortRelatedRecordsMutation;
