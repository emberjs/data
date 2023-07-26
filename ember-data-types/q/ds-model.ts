import type Model from '@ember-data/model';

export type ModelSchema = Pick<
  typeof Model,
  | 'modelName'
  | 'fields'
  | 'attributes'
  | 'relationshipsByName'
  | 'eachAttribute'
  | 'eachRelationship'
  | 'eachTransformedAttribute'
>;
