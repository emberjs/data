type ModelRegistry = import('@ember-data/store/-private/ts-interfaces/registries').ModelRegistry;
type RecordData = import('./record-data').RecordData;

type RelationshipsSchema = import('./record-data-schemas').RelationshipsSchema;
type AttributesSchema = import('./record-data-schemas').AttributesSchema;

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
  relationshipsDefinitionFor(type: keyof ModelRegistry): RelationshipsSchema;
  attributesDefinitionFor(type: keyof ModelRegistry): AttributesSchema;

  /**
   * update the `id` for the record of type `modelName` with the corresponding `clientId`
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @public
   */
  setRecordId(type: keyof ModelRegistry, id: string, clientId: string): void;

  disconnectRecord(type: keyof ModelRegistry, id: string | null, clientId: string): void;
  disconnectRecord(type: keyof ModelRegistry, id: string, clientId?: string | null): void;
  disconnectRecord(type: keyof ModelRegistry, id: string | null, clientId?: string | null): void;

  isRecordInUse(type: keyof ModelRegistry, id: string | null, clientId: string): boolean;
  isRecordInUse(type: keyof ModelRegistry, id: string, clientId?: string | null): boolean;
  isRecordInUse(type: keyof ModelRegistry, id: string | null, clientId?: string | null): boolean;

  notifyPropertyChange(type: keyof ModelRegistry, id: string | null, clientId: string | null, key: string): void;

  notifyHasManyChange(type: keyof ModelRegistry, id: string | null, clientId: string, key: string): void;
  notifyHasManyChange(type: keyof ModelRegistry, id: string, clientId: string | null | undefined, key: string): void;
  notifyHasManyChange(
    type: keyof ModelRegistry,
    id: string | null,
    clientId: string | null | undefined,
    key: string
  ): void;

  recordDataFor(type: keyof ModelRegistry, id: string, lid?: string | null): RecordData;
  recordDataFor(type: keyof ModelRegistry, id: string | null, lid: string): RecordData;
  recordDataFor(type: keyof ModelRegistry): RecordData;
  recordDataFor(type: keyof ModelRegistry, id?: string | null, lid?: string | null): RecordData;

  notifyBelongsToChange(type: keyof ModelRegistry, id: string | null, clientId: string, key: string): void;
  notifyBelongsToChange(type: keyof ModelRegistry, id: string, clientId: string | null | undefined, key: string): void;
  notifyBelongsToChange(
    type: keyof ModelRegistry,
    id: string | null,
    clientId: string | null | undefined,
    key: string
  ): void;

  inverseForRelationship(type: keyof ModelRegistry, key: string): string | null;

  inverseIsAsyncForRelationship(type: keyof ModelRegistry, key: string): boolean;
  notifyErrorsChange(type: keyof ModelRegistry, id: string | null, clientId: string | null): void;
  notifyStateChange(type: keyof ModelRegistry, id: string | null, clientId: string | null, key?: string): void;
}
