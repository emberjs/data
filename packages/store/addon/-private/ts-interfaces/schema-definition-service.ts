/**
  @module @ember-data/store
*/

import type { RecordIdentifier } from './identifier';
import type { AttributesSchema, RelationshipsSchema } from './record-data-schemas';

export interface SchemaDefinitionService {
  doesTypeExist(modelName: string): boolean;
  attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema;
  relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema;
}
