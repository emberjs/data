import { RelationshipsSchema, AttributesSchema } from "./record-data-schemas";
export interface RecordDataStoreWrapper {
  relationshipsDefinitionFor(modelName: string): RelationshipsSchema;
  attributesDefinitionFor(modelName: string): AttributesSchema;
  setRecordId(modelName: string, id: string, clientId: string);
  disconnectRecord(modelName: string, id: string | null, clientId: string);
  isRecordInUse(modelName: string, id: string | null, clientId: string): boolean;
  notifyPropertyChange(modelName: string, id: string | null, clientId: string | null, key: string);
  // Needed For relationships
  notifyHasManyChange(modelName: string, id: string | null, clientId: string | null, key: string);
  recordDataFor(modelName: string, id: string, clientId?: string);
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string | null, key: string);
  inverseForRelationship(modelName: string, key: string);
  inverseIsAsyncForRelationship(modelName: string, key: string);
}
