import type { RecordData } from './record-data';
import type { AttributesSchema, RelationshipsSchema } from './record-data-schemas';

/**
  @module @ember-data/store
*/

/**
 * Provides encapsulated API access to a minimal subset of store service's
 * functionality for RecordData implementations.
 *
 * @class RecordDataStoreWrapper
 * @public
 */
export interface RecordDataStoreWrapper {
  relationshipsDefinitionFor(modelName: string): RelationshipsSchema;
  attributesDefinitionFor(modelName: string): AttributesSchema;

  /**
   * update the `id` for the record of type `modelName` with the corresponding `clientId`
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @public
   */
  setRecordId(modelName: string, id: string, clientId: string): void;

  disconnectRecord(modelName: string, id: string | null, clientId: string): void;
  disconnectRecord(modelName: string, id: string, clientId?: string | null): void;
  disconnectRecord(modelName: string, id: string | null, clientId?: string | null): void;

  isRecordInUse(modelName: string, id: string | null, clientId: string): boolean;
  isRecordInUse(modelName: string, id: string, clientId?: string | null): boolean;
  isRecordInUse(modelName: string, id: string | null, clientId?: string | null): boolean;

  notifyPropertyChange(modelName: string, id: string | null, clientId: string | null, key: string): void;

  notifyHasManyChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyHasManyChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyHasManyChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void;

  recordDataFor(type: string, id: string, lid?: string | null): RecordData;
  recordDataFor(type: string, id: string | null, lid: string): RecordData;
  recordDataFor(type: string): RecordData;
  recordDataFor(type: string, id?: string | null, lid?: string | null): RecordData;

  notifyBelongsToChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyBelongsToChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void;

  inverseForRelationship(modelName: string, key: string): string | null;

  inverseIsAsyncForRelationship(modelName: string, key: string): boolean;
  notifyErrorsChange(modelName: string, id: string | null, clientId: string | null): void;
  notifyStateChange(modelName: string, id: string | null, clientId: string | null, key?: string): void;
}
