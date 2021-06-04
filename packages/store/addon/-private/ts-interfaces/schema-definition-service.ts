/**
  @module @ember-data/store
*/

type ModelRegistry = import('@ember-data/store/-private/ts-interfaces/registries').ModelRegistry;
type AttributesSchema = import('./record-data-schemas').AttributesSchema;
type RelationshipsSchema = import('./record-data-schemas').RelationshipsSchema;
type RecordIdentifier = import('./identifier').RecordIdentifier;

export interface SchemaDefinitionService {
  doesTypeExist(type: string): type is keyof ModelRegistry;
  attributesDefinitionFor(identifier: RecordIdentifier | keyof ModelRegistry): AttributesSchema;
  relationshipsDefinitionFor(identifier: RecordIdentifier | keyof ModelRegistry): RelationshipsSchema;
}
