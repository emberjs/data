import { BRAND_SYMBOL } from './utils/brand';

type RelationshipsSchema = import('./record-data-schemas').RelationshipsSchema;
type AttributesSchema = import('./record-data-schemas').AttributesSchema;

/**
  @module @ember-data/store
*/

/**
 * Provides a encapsulated API access to a subset of store methods
 * for RecordData implementations.
 */
export interface RecordDataStoreWrapper {
  /**
   * @internal
   */
  [BRAND_SYMBOL]: 'RecordDataStoreWrapper';

  relationshipsDefinitionFor(modelName: string): RelationshipsSchema;
  attributesDefinitionFor(modelName: string): AttributesSchema;

  /**
   * update the `id` for the record of type `modelName` with the corresponding `clientId`
   * This operation can only be done for records whose `id` is `null`.
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

  recordDataFor(modelName: string, id: string, clientId?: string): unknown;

  notifyBelongsToChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyBelongsToChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void;

  inverseForRelationship(modelName: string, key: string): string | null;

  inverseIsAsyncForRelationship(modelName: string, key: string): boolean;
  notifyErrorsChange(modelName: string, id: string | null, clientId: string | null): void;
  notifyStateChange(modelName: string, id: string | null, clientId: string | null, key?: string): void;
}
