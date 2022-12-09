import { IdentifierCache } from '@ember-data/store/-private/caches/identifier-cache';
import { NotificationType } from '@ember-data/store/-private/managers/record-notification-manager';

import type { Cache } from './cache';
import { StableRecordIdentifier } from './identifier';
import type { AttributesSchema, RelationshipsSchema } from './record-data-schemas';
import { SchemaDefinitionService } from './schema-definition-service';

/**
  @module @ember-data/store
*/

/**
 * CacheStoreWrapper provides encapsulated API access to the minimal
 * subset of the Store's functionality that Cache implementations
 * should interact with. It is provided to the Store's `createCache`
 * hook.
 *
 * Cache implementations should not need more than this API provides.
 *
 * This class cannot be directly instantiated.
 *
 * @class CacheStoreWrapper
 * @public
 */
export interface LegacyCacheStoreWrapper {
  /**
   * Provides access to the IdentifierCache instance
   * for this Store instance.
   *
   * The IdentifierCache can be used to peek, generate or
   * retrieve a stable unique identifier for any resource.
   *
   * @property {IdentifierCache} identifierCache
   * @public
   */
  identifierCache: IdentifierCache;

  /**
   * Provides access to the SchemaDefinitionService instance
   * for this Store instance.
   *
   * The SchemaDefinitionService can be used to query for
   * information about the schema of a resource.
   *
   * @method getSchemaDefinitionService
   * @public
   */
  getSchemaDefinitionService(): SchemaDefinitionService;

  /**
   * Proxies to the schema service's `relationshipsDefinitionFor`
   * method.
   *
   * Use `wrapper.getSchemaDefinitionService().relationshipsDefinitionFor()`
   * instead.
   *
   * @method relationshipsDefinitionFor
   * @param {string} modelName
   * @returns {RelationshipsSchema}
   * @public
   * @deprecated
   */
  relationshipsDefinitionFor(modelName: string): RelationshipsSchema;

  /**
   * Proxies to the schema service's `attributesDefinitionFor`
   * method.
   *
   * Use `wrapper.getSchemaDefinitionService().attributesDefinitionFor()`
   * instead.
   *
   * @method attributesDefinitionFor
   * @param {string} modelName
   * @returns {AttributesSchema}
   * @public
   * @deprecated
   */
  attributesDefinitionFor(modelName: string): AttributesSchema;

  /**
   * Update the `id` for the record corresponding to the identifier
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @param {StableRecordIdentifier} identifier;
   * @param {string} id;
   * @public
   */
  setRecordId(modelName: string, id: string, clientId: string): void;
  setRecordId(identifier: StableRecordIdentifier, id: string): void;

  /**
   * Signal to the store that the specified record may be considered fully
   * removed from the cache. Generally this means that not only does no
   * data exist for the identified resource, no known relationships still
   * point to it either.
   *
   * @method disconnectRecord
   * @param {StableRecordIdentifier} identifier
   * @public
   */
  disconnectRecord(modelName: string, id: string | null, clientId: string): void;
  disconnectRecord(modelName: string, id: string, clientId?: string | null): void;
  disconnectRecord(modelName: string, id: string | null, clientId?: string | null): void;
  disconnectRecord(identifier: StableRecordIdentifier): void;

  /**
   * Use hasRecord instead.
   *
   * @method isRecordInUse
   * @param modelName
   * @param id
   * @param clientId
   * @public
   * @deprecated
   */
  isRecordInUse(modelName: string, id: string | null, clientId: string): boolean;
  isRecordInUse(modelName: string, id: string, clientId?: string | null): boolean;
  isRecordInUse(modelName: string, id: string | null, clientId?: string | null): boolean;

  /**
   * Use this method to determine if the Store has an instantiated record associated
   * with an identifier.
   *
   * @method hasRecord
   * @param identifier
   * @returns {boolean}
   * @public
   */
  hasRecord(identifier: StableRecordIdentifier): boolean;

  /**
   * Use notifyChange
   *
   * @method notifyPropertyChange
   * @param modelName
   * @param id
   * @param clientId
   * @param key
   * @deprecated
   * @public
   */
  notifyPropertyChange(modelName: string, id: string | null, clientId: string | null, key: string): void;

  /**
   * Use notifyChange
   *
   * @method notifyHasManyChange
   * @param modelName
   * @param id
   * @param clientId
   * @param key
   * @public
   * @deprecated
   */
  notifyHasManyChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyHasManyChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyHasManyChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void;

  /**
   * Used to retrieve the associated RecordData for a given identifier.
   *
   * To generate a RecordData for a new client-side resource that does not
   * yet have an ID and place it in the new state, first create an identifier
   * via `identifierCache.createIdentifierForNewRecord`
   *
   * Then once you have obtained the RecordData instance you should invoke
   * `recordData.clientDidCreate` to ensure the cache entry is put into the
   * correct "newly created" state.
   *
   * @method recordDataFor
   * @param {StableRecordIdentifier} identifier
   * @return {Cache} the RecordData cache instance associated with the identifier
   * @public
   */
  recordDataFor(type: string, id: string, lid?: string | null): Cache;
  recordDataFor(type: string, id: string | null, lid: string): Cache;
  recordDataFor(type: string): Cache;
  recordDataFor(type: string, id?: string | null, lid?: string | null): Cache;
  recordDataFor(identifier: StableRecordIdentifier): Cache;

  /**
   * Use notifyChange
   *
   * @method notifyBelongsToChange
   * @param modelName
   * @param id
   * @param clientId
   * @param key
   * @public
   * @deprecated
   */
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyBelongsToChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void;

  /**
   * Notify subscribers of the RecordNotificationManager that cache state has changed.
   *
   * `attributes` and `relationships` do not require a key, but if one is specified it
   * is assumed to be the name of the attribute or relationship that has been updated.
   *
   * No other namespaces currently expect the `key` argument.
   *
   * @method notifyChange
   * @param {StableRecordIdentifier} identifier
   * @param {'attributes' | 'relationships' | 'identity' | 'errors' | 'meta' | 'state'} namespace
   * @param {string|undefined} key
   * @public
   */
  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key?: string): void;

  /**
   * Use notifyChange
   *
   * @method notifyErrorsChange
   * @param modelName
   * @param id
   * @param clientId
   * @public
   * @deprecated
   */
  notifyErrorsChange(modelName: string, id: string | null, clientId: string | null): void;

  /**
   * Use notifyChange
   *
   * @method notifyStateChange
   * @param modelName
   * @param id
   * @param clientId
   * @param key
   * @public
   * @deprecated
   */
  notifyStateChange(modelName: string, id: string | null, clientId: string | null, key?: string): void;
}

export interface V2CacheStoreWrapper {
  identifierCache: IdentifierCache;
  getSchemaDefinitionService(): SchemaDefinitionService;

  setRecordId(identifier: StableRecordIdentifier, id: string): void;

  disconnectRecord(identifier: StableRecordIdentifier): void;

  hasRecord(identifier: StableRecordIdentifier): boolean;

  recordDataFor(identifier: StableRecordIdentifier): Cache;

  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key?: string): void;
}

export type CacheStoreWrapper = LegacyCacheStoreWrapper | V2CacheStoreWrapper;
