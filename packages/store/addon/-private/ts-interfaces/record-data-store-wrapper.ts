import { RelationshipsSchema, AttributesSchema } from './record-data-schemas';

/**
  @module @ember-data/store
*/

export interface RecordDataStoreWrapper {
  relationshipsDefinitionFor(modelName: string): RelationshipsSchema;
  attributesDefinitionFor(modelName: string): AttributesSchema;
  setRecordId(modelName: string, id: string, clientId: string): void;
  disconnectRecord(modelName: string, id: string | null, clientId: string): void;
  isRecordInUse(modelName: string, id: string | null, clientId: string): boolean;
  notifyPropertyChange(
    modelName: string,
    id: string | null,
    clientId: string | null,
    key: string
  ): void;
  // Needed For relationships
  notifyHasManyChange(
    modelName: string,
    id: string | null,
    clientId: string | null,
    key: string
  ): void;
  recordDataFor(modelName: string, id: string, clientId?: string): unknown;
  notifyBelongsToChange(
    modelName: string,
    id: string | null,
    clientId: string | null,
    key: string
  ): void;
  inverseForRelationship(modelName: string, key: string): string;
  inverseIsAsyncForRelationship(modelName: string, key: string): boolean;
}
