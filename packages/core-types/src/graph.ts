import type { CollectionRelationship, ResourceRelationship } from './cache/relationship';
import type { StableRecordIdentifier } from './identifier';
import type { CollectionResourceRelationship, SingleResourceRelationship } from './spec/json-api-raw';

export interface Graph {
  identifiers: Map<StableRecordIdentifier, unknown>;

  getData(identifier: StableRecordIdentifier, field: string): ResourceRelationship | CollectionRelationship;

  remove(identifier: StableRecordIdentifier): void;
  registerPolymorphicType(abstract: string, concrete: string): void;
  destroy(): void;
}

/**
 * Operations are granular instructions that can be applied to a cache to
 * update its state.
 *
 * They are a bit like a PATCH but with greater context around the specific
 * change being requested.
 *
 * @typedoc
 */
export interface Operation {
  op: string;
}

/**
 * Replace the current relationship remote state with an entirely
 * new state.
 *
 * Effectively a PUT on the specific field.
 *
 * > [!Warning]
 * > This operation behaves differently when used on a paginated collection.
 * > In the paginated case, value is used to update the links and meta of the
 * > relationshipObject.
 * > If data is present, it is presumed that the data represents the data that
 * > would be found on the `related` link in links, and will update the data
 * > links, and meta on that page.
 *
 * @typedoc
 */
export interface UpdateRelationshipOperation {
  op: 'updateRelationship';
  /**
   * The resource to operate on
   * @typedoc
   */
  record: StableRecordIdentifier;
  /**
   * The field on the resource that is being updated.
   * @typedoc
   */
  field: string;
  /**
   * The new value for the relationship.
   * @typedoc
   */
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
