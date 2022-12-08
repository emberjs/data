import type EmberObject from '@ember/object';

import type { Errors } from '@ember-data/model/-private';
import type Store from '@ember-data/store';

import type { JsonApiValidationError } from './record-data-json-api';
import type { AttributeSchema, RelationshipSchema, RelationshipsSchema } from './record-data-schemas';

// Placeholder until model.js is typed
export interface DSModel extends EmberObject {
  constructor: DSModelSchema;
  store: Store;
  errors: Errors;
  toString(): string;
  save(): Promise<DSModel>;
  eachRelationship<T>(callback: (this: T, key: string, meta: RelationshipSchema) => void, binding?: T): void;
  eachAttribute<T>(callback: (this: T, key: string, meta: AttributeSchema) => void, binding?: T): void;
  invalidErrorsChanged(errors: JsonApiValidationError[]): void;
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
  eachTransformedAttribute<T>(callback: (this: T, key: string, type: string) => void, binding?: T): void;
  toString(): string;
}

// This is the static side of DSModel should become DSModel
//  once we can type it.
export interface DSModelSchema extends ModelSchema {
  isModel: true;
  relationshipsObject: RelationshipsSchema;
  extend(...mixins: unknown[]): DSModelSchema;
  reopenClass(...mixins: unknown[]): void;
}
