type Errors = import('@ember-data/model/-private').Errors;
type CoreStore = import('../system/core-store').default;
type InternalModel = import('../system/model/internal-model').default;
type Promise<T> = import('rsvp').Promise<T>;
type EmberObject = import('@ember/object').default;
type RelationshipsSchema = import('./record-data-schemas').RelationshipsSchema;
type RelationshipSchema = import('./record-data-schemas').RelationshipSchema;
type AttributeSchema = import('./record-data-schemas').AttributeSchema;
type JsonApiValidationError = import('./record-data-json-api').JsonApiValidationError;

// Placeholder until model.js is typed
export interface DSModel extends EmberObject {
  constructor: DSModelSchema;
  store: CoreStore;
  errors: Errors;
  _internalModel: InternalModel;
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
// This is the static side of DSModel should become DSModel
//  once we can type it.
export interface ModelSchema {
  isModel: boolean;
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
export interface DSModelSchema extends ModelSchema {
  isModel: true;
  relationshipsObject: RelationshipsSchema;
  extend(...mixins: unknown[]): DSModelSchema;
  reopenClass(...mixins: unknown[]): void;
}
