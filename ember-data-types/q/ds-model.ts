import type EmberObject from '@ember/object';

import type { Errors } from '@ember-data/model/-private';
import type Store from '@ember-data/store';

import { Cache } from './cache';
import { StableRecordIdentifier } from './identifier';
import type { JsonApiError } from './record-data-json-api';
import type { AttributeSchema, RelationshipSchema, RelationshipsSchema } from './record-data-schemas';

export type ModelFactory = { class: DSModelSchema };
export type FactoryCache = Record<string, ModelFactory>;
// we put this on the store for interop because it's used by modelFor and
// instantiateRecord as well.
export type ModelStore = Store & { _modelFactoryCache: FactoryCache };

// Placeholder until model.js is typed
export interface DSModel extends EmberObject {
  constructor: DSModelSchema;
  store: Store;
  errors: Errors;
  toString(): string;
  save(): Promise<DSModel>;
  eachRelationship<T>(callback: (this: T, key: string, meta: RelationshipSchema) => void, binding?: T): void;
  eachAttribute<T>(callback: (this: T, key: string, meta: AttributeSchema) => void, binding?: T): void;
  invalidErrorsChanged(errors: JsonApiError[]): void;
  rollbackAttributes(): void;
  changedAttributes(): Record<string, [unknown, unknown]>;
  [key: string]: unknown;
  isDeleted: boolean;
  deleteRecord(): void;
  unloadRecord(): void;
  _notifyProperties(keys: string[]): void;
}

// Implemented by both ShimModelClass and DSModel
export interface ModelSchema {
  modelName: string;
  fields: Map<string, 'attribute' | 'belongsTo' | 'hasMany'>;
  attributes: Map<string, AttributeSchema>;
  relationshipsByName: Map<string, RelationshipSchema>;
  eachAttribute<T>(callback: (this: T, key: string, attribute: AttributeSchema) => void, binding?: T): void;
  eachRelationship<T>(callback: (this: T, key: string, relationship: RelationshipSchema) => void, binding?: T): void;
  eachTransformedAttribute<T>(callback: (this: T, key: string, type?: string) => void, binding?: T): void;
  toString(): string;
}

export type DSModelCreateArgs = {
  _createProps: Record<string, unknown>;
  // TODO @deprecate consider deprecating accessing record properties during init which the below is necessary for
  _secretInit: {
    identifier: StableRecordIdentifier;
    cache: Cache;
    store: Store;
    cb: (record: DSModel, cache: Cache, identifier: StableRecordIdentifier, store: Store) => void;
  };
};

// This is the static side of DSModel should become DSModel
//  once we can type it.
export interface DSModelSchema extends ModelSchema {
  isModel: true;
  relationshipsObject: RelationshipsSchema;
  extend(...mixins: unknown[]): DSModelSchema;
  reopenClass(...mixins: unknown[]): void;
  create(createArgs: DSModelCreateArgs): DSModel;
}
