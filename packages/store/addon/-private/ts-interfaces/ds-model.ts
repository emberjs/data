import type EmberObject from '@ember/object';

import type { Errors } from '@ember-data/model/-private';
import { ResolvedRegistry } from '@ember-data/types';
import { AttributeFieldsFor, RecordType, RelationshipFieldsFor } from '@ember-data/types/utils';

import type InternalModel from '../system/model/internal-model';
import type Store from '../system/store';
import type { JsonApiValidationError } from './record-data-json-api';
import type { AttributeSchema, RelationshipSchema, RelationshipsSchema } from './record-data-schemas';

export type AttributesMap<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends AttributeFieldsFor<R, T> = AttributeFieldsFor<R, T>
> = Map<F, AttributeSchema<R, T, F>>;

export type RelationshipsMap<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
> = Map<F, RelationshipSchema<R, T, F>>;

// Placeholder until model.js is typed
export interface DSModel<R extends ResolvedRegistry, T extends RecordType<R>> extends EmberObject {
  constructor: DSModelSchema<R, T>;
  store: Store<R>;
  errors: Errors;
  _internalModel: InternalModel<R, T>;
  toString(): string;
  save(): Promise<DSModel<R, T>>;
  eachRelationship<I>(
    callback: <F extends RelationshipFieldsFor<R, T>>(this: I, key: string, meta: RelationshipSchema<R, T, F>) => void,
    binding?: T
  ): void;
  eachAttribute<I>(
    callback: <F extends AttributeFieldsFor<R, T>>(this: I, key: F, meta: AttributeSchema<R, T, F>) => void,
    binding?: T
  ): void;
  invalidErrorsChanged(errors: JsonApiValidationError[]): void;
  [key: string]: unknown;
  isDeleted: boolean;
  deleteRecord(): void;
  unloadRecord(): void;
  _notifyProperties(keys: string[]): void;
}

// Implemented by both ShimModelClass and DSModel
export interface ModelSchema<R extends ResolvedRegistry, T extends RecordType<R>> {
  modelName: T;
  fields: Map<string, 'attribute' | 'belongsTo' | 'hasMany'>;
  attributes: AttributesMap<R, T>;
  relationshipsByName: RelationshipsMap<R, T>;
  eachRelationship<I>(
    callback: <F extends RelationshipFieldsFor<R, T>>(this: I, key: F, meta: RelationshipSchema<R, T, F>) => void,
    binding?: I
  ): void;
  eachAttribute<I>(
    callback: <F extends AttributeFieldsFor<R, T>>(this: I, key: F, meta: AttributeSchema<R, T, F>) => void,
    binding?: I
  ): void;
  eachTransformedAttribute<I>(
    callback: <F extends AttributeFieldsFor<R, T>>(this: I, key: F, attribute: AttributeSchema<R, T, F>) => void,
    binding?: I
  ): void;
  toString(): string;
}

// This is the static side of DSModel should become DSModel
//  once we can type it.
export interface DSModelSchema<R extends ResolvedRegistry, T extends RecordType<R>> extends ModelSchema<R, T> {
  isModel: true;
  relationshipsObject: RelationshipsSchema<R, T>;
  extend(...mixins: unknown[]): DSModelSchema<R, RecordType<R>>;
  reopenClass(...mixins: unknown[]): void;
}
