/**
  @module @ember-data/store
*/

type AttributesSchema = import('./record-data-schemas').AttributesSchema;
type RelationshipsSchema = import('./record-data-schemas').RelationshipsSchema;
type RecordIdentifier = import('./identifier').RecordIdentifier;

export interface SchemaDefinitionService {
  doesTypeExist(modelName: string): boolean;
  attributesDefinitionFor(identifier: RecordIdentifier | string): AttributesSchema;
  relationshipsDefinitionFor(identifier: RecordIdentifier | string): RelationshipsSchema;
}
