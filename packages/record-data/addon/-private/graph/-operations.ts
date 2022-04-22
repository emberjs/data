import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import { DefaultRegistry, ResolvedRegistry } from '@ember-data/types';
import {
  BelongsToRelationshipFieldsFor,
  RecordType,
  RelatedType,
  RelationshipFieldsFor,
} from '@ember-data/types/utils';

export interface Operation {
  op: string;
}

export interface UpdateRelationshipOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> {
  op: 'updateRelationship';
  record: StableRecordIdentifier<T>;
  field: F;
  value: SingleResourceRelationship<RelatedType<R, T, F>> | CollectionResourceRelationship<RelatedType<R, T, F>>;
}

export interface DeleteRecordOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>
> {
  op: 'deleteRecord';
  record: StableRecordIdentifier<T>;
  isNew: boolean;
}

export interface UnknownOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> {
  op: 'never';
  record: StableRecordIdentifier<T>;
  field: F;
}

export interface AddToRelatedRecordsOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> {
  op: 'addToRelatedRecords';
  record: StableRecordIdentifier<T>;
  field: F; // "relationship" propertyName
  value: StableRecordIdentifier<RelatedType<R, T, F>> | StableRecordIdentifier<RelatedType<R, T, F>>[]; // related record
  index?: number; // the index to insert at
}

export interface RemoveFromRelatedRecordsOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> {
  op: 'removeFromRelatedRecords';
  record: StableRecordIdentifier<T>;
  field: F; // "relationship" propertyName
  value: StableRecordIdentifier<RelatedType<R, T, F>> | StableRecordIdentifier<RelatedType<R, T, F>>[]; // related record
}

export interface ReplaceRelatedRecordOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>
> {
  op: 'replaceRelatedRecord';
  record: StableRecordIdentifier<T>;
  field: F;
  value: StableRecordIdentifier<RelatedType<R, T, F>> | null;
}

export interface ReplaceRelatedRecordsOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> {
  op: 'replaceRelatedRecords';
  record: StableRecordIdentifier<T>;
  field: F;
  value: StableRecordIdentifier<RelatedType<R, T, F>>[];
}

export type RemoteRelationshipOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> =
  | UpdateRelationshipOperation<R, T, F>
  | ReplaceRelatedRecordOperation<R, T, BelongsToRelationshipFieldsFor<R, T>>
  | ReplaceRelatedRecordsOperation<R, T, F>
  | DeleteRecordOperation<R, T>;

export type LocalRelationshipOperation<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> =
  | ReplaceRelatedRecordsOperation<R, T, F>
  | ReplaceRelatedRecordOperation<R, T, BelongsToRelationshipFieldsFor<R, T>>
  | RemoveFromRelatedRecordsOperation<R, T, F>
  | AddToRelatedRecordsOperation<R, T, F>;
