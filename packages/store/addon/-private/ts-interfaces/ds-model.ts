import RSVP from 'rsvp';
import EmberObject from '@ember/object';
import { JsonApiValidationError } from './record-data-json-api';
import { RecordInstance } from './record-instance';
import { RelationshipSchema, AttributeSchema } from './record-data-schemas';

// Placeholder until model.js is typed
export interface DSModel extends RecordInstance, EmberObject {
  toString(): string;
  save(): RSVP.Promise<DSModel>;
  eachRelationship(callback: (key: string, meta: RelationshipSchema) => void): void;
  eachAttribute(callback: (key: string) => void): void;
  invalidErrorsChanged(errors: JsonApiValidationError[]): void;
  [key: string]: unknown;
}

// When model.js is typed this should be the static methods and properties
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
