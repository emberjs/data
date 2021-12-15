import EmberObject from '@ember/object';

import RSVP from 'rsvp';

import type { JsonApiValidationError } from './record-data-json-api';
import type { AttributeSchema, RelationshipSchema } from './record-data-schemas';
import { RecordInstance } from './record-instance';

// Placeholder until model.js is typed
export interface DSModel extends RecordInstance, EmberObject {
  toString(): string;
  save(): RSVP.Promise<DSModel>;
  eachRelationship<T>(callback: (this: T, key: string, meta: RelationshipSchema) => void, binding?: T): void;
  eachAttribute<T>(callback: (this: T, key: string, meta: AttributeSchema) => void, binding?: T): void;
  invalidErrorsChanged(errors: JsonApiValidationError[]): void;
  [key: string]: unknown;
  isDeleted: boolean;
  deleteRecord(): void;
  unloadRecord(): void;
  errors: any;
}

// Implemented by both ShimModelClass and DSModel
export interface ModelSchema {
  modelName: string;
  fields: Map<string, 'attribute' | 'belongsTo' | 'hasMany'>;
  attributes: Map<string, AttributeSchema>;
  relationshipsByName: Map<string, RelationshipSchema>;
  eachAttribute<T>(callback: (this: T, key: string, attribute: AttributeSchema) => void, binding?: T): void;
  eachRelationship<T>(callback: (this: T, key: string, relationship: RelationshipSchema) => void, binding?: T): void;
  eachTransformedAttribute<T>(
    callback: (this: T, key: string, relationship: RelationshipSchema) => void,
    binding?: T
  ): void;
  toString(): string;
}

// This is the static side of DSModel should become DSModel
//  once we can type it.
export interface DSModelSchema extends ModelSchema {
  isModel: true;
}
