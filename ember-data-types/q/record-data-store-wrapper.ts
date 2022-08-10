import { IdentifierCache } from '@ember-data/store/-private/caches/identifier-cache';
import { NotificationType } from '@ember-data/store/-private/managers/record-notification-manager';

import { StableRecordIdentifier } from './identifier';
import type { RecordData } from './record-data';
import type { AttributesSchema, RelationshipsSchema } from './record-data-schemas';
import { SchemaDefinitionService } from './schema-definition-service';

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
export interface LegacyRecordDataStoreWrapper {
  identifierCache: IdentifierCache;
  getSchemaDefinitionService(): SchemaDefinitionService;

  /** @deprecated */
  relationshipsDefinitionFor(modelName: string): RelationshipsSchema;

  /** @deprecated */
  attributesDefinitionFor(modelName: string): AttributesSchema;

  /**
   * update the `id` for the record of type `modelName` with the corresponding `clientId`
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @public
   */
  /** @deprecated */
  setRecordId(modelName: string, id: string, clientId: string): void;
  setRecordId(identifier: StableRecordIdentifier, id: string): void;

  /** @deprecated */
  disconnectRecord(modelName: string, id: string | null, clientId: string): void;
  /** @deprecated */
  disconnectRecord(modelName: string, id: string, clientId?: string | null): void;
  /** @deprecated */
  disconnectRecord(modelName: string, id: string | null, clientId?: string | null): void;
  disconnectRecord(identifier: StableRecordIdentifier): void;

  /** @deprecated */
  isRecordInUse(modelName: string, id: string | null, clientId: string): boolean;
  /** @deprecated */
  isRecordInUse(modelName: string, id: string, clientId?: string | null): boolean;
  /** @deprecated */
  isRecordInUse(modelName: string, id: string | null, clientId?: string | null): boolean;

  hasRecord(identifier: StableRecordIdentifier): boolean;

  /** @deprecated */
  notifyPropertyChange(modelName: string, id: string | null, clientId: string | null, key: string): void;

  /** @deprecated */
  notifyHasManyChange(modelName: string, id: string | null, clientId: string, key: string): void;
  /** @deprecated */
  notifyHasManyChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  /** @deprecated */
  notifyHasManyChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void;

  /** @deprecated */
  recordDataFor(type: string, id: string, lid?: string | null): RecordData;
  /** @deprecated */
  recordDataFor(type: string, id: string | null, lid: string): RecordData;
  /** @deprecated */
  recordDataFor(type: string): RecordData;
  /** @deprecated */
  recordDataFor(type: string, id?: string | null, lid?: string | null): RecordData;
  recordDataFor(identifier: StableRecordIdentifier): RecordData;

  /** @deprecated */
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string, key: string): void;
  /** @deprecated */
  notifyBelongsToChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  /** @deprecated */
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void;

  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType): void;

  /** @deprecated */
  inverseForRelationship(modelName: string, key: string): string | null;
  inverseForRelationship(identifier: StableRecordIdentifier | { type: string }, key: string): string | null;

  /** @deprecated */
  notifyErrorsChange(modelName: string, id: string | null, clientId: string | null): void;
  /** @deprecated */
  notifyStateChange(modelName: string, id: string | null, clientId: string | null, key?: string): void;
}

export interface V2RecordDataStoreWrapper {
  identifierCache: IdentifierCache;
  getSchemaDefinitionService(): SchemaDefinitionService;

  /**
   * update the `id` for the record corresponding to the identifier
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @public
   */
  // TODO do we actually still need this?
  setRecordId(identifier: StableRecordIdentifier, id: string): void;

  disconnectRecord(identifier: StableRecordIdentifier): void;

  hasRecord(identifier: StableRecordIdentifier): boolean;

  recordDataFor(identifier: StableRecordIdentifier): RecordData;

  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key?: string): void;

  inverseForRelationship(identifier: StableRecordIdentifier | { type: string }, key: string): string | null;
}

export type RecordDataStoreWrapper = LegacyRecordDataStoreWrapper | V2RecordDataStoreWrapper;
