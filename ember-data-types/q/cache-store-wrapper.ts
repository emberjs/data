import { IdentifierCache } from '@ember-data/store/-private/caches/identifier-cache';
import { NotificationType } from '@ember-data/store/-private/managers/notification-manager';

import { StableDocumentIdentifier } from '../cache/identifier';
import { StableRecordIdentifier } from './identifier';
import { SchemaService } from './schema-service';

/**
  @module @ember-data/store
*/

/**
 * CacheStoreWrapper provides encapsulated API access to the minimal
 * subset of the Store's functionality that Cache implementations
 * should interact with. It is provided to the Store's `createRecordDataFor`
 * and `createCache` hooks.
 *
 * Cache implementations should not need more than this API provides.
 *
 * This class cannot be directly instantiated.
 *
 * @class CacheStoreWrapper
 * @public
 */
export interface CacheStoreWrapper {
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
  getSchemaDefinitionService(): SchemaService;

  /**
   * Update the `id` for the record corresponding to the identifier
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @param {StableRecordIdentifier} identifier;
   * @param {string} id;
   * @public
   */
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
  disconnectRecord(identifier: StableRecordIdentifier): void;

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
   * Notify subscribers of the NotificationManager that cache state has changed.
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
  notifyChange(identifier: StableRecordIdentifier, namespace: 'added' | 'removed'): void;
  notifyChange(identifier: StableDocumentIdentifier, namespace: 'added' | 'updated' | 'removed'): void;
  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key?: string): void;
  notifyChange(
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    namespace: NotificationType | 'added' | 'removed' | 'updated',
    key?: string
  ): void;
}
