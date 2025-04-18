import type { RequestCacheKey, ResourceCacheKey } from '@warp-drive/core-types/identifier';

import type { IdentifierCache } from '../../-private/caches/identifier-cache';
import type { NotificationType } from '../../-private/managers/notification-manager';
import type { SchemaService } from './schema-service';

/**
  @module @ember-data/store
*/

/**
 * CacheCapabilitiesManager provides encapsulated API access to the minimal
 * subset of the Store's functionality that Cache implementations
 * should interact with. It is provided to the Store's `createCache` hook.
 *
 * Cache implementations should not need more than this API provides.
 *
 * This class cannot be directly instantiated.
 *
 * @class CacheCapabilitiesManager
 * @public
 */
export type CacheCapabilitiesManager = {
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
   * DEPRECATED - use the schema property
   *
   * Provides access to the SchemaService instance
   * for this Store instance.
   *
   * The SchemaService can be used to query for
   * information about the schema of a resource.
   *
   * @method getSchemaDefinitionService
   * @deprecated
   * @public
   */
  getSchemaDefinitionService(): SchemaService;

  /**
   * Provides access to the SchemaService instance
   * for this Store instance.
   *
   * The SchemaService can be used to query for
   * information about the schema of a resource.
   *
   * @property schema
   * @public
   */
  schema: SchemaService;

  /**
   * Update the `id` for the record corresponding to the identifier
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @param {ResourceCacheKey} identifier;
   * @param {string} id;
   * @public
   */
  setRecordId(identifier: ResourceCacheKey, id: string): void;

  /**
   * Signal to the store that the specified record may be considered fully
   * removed from the cache. Generally this means that not only does no
   * data exist for the identified resource, no known relationships still
   * point to it either.
   *
   * @method disconnectRecord
   * @param {ResourceCacheKey} identifier
   * @public
   */
  disconnectRecord(identifier: ResourceCacheKey): void;

  /**
   * Use this method to determine if the Store has an instantiated record associated
   * with an identifier.
   *
   * @method hasRecord
   * @param identifier
   * @return {boolean}
   * @public
   */
  hasRecord(identifier: ResourceCacheKey): boolean;

  /**
   * Notify subscribers of the NotificationManager that cache state has changed.
   *
   * `attributes` and `relationships` do not require a key, but if one is specified it
   * is assumed to be the name of the attribute or relationship that has been updated.
   *
   * No other namespaces currently expect the `key` argument.
   *
   * @method notifyChange
   * @param {ResourceCacheKey} identifier
   * @param {'attributes' | 'relationships' | 'identity' | 'errors' | 'meta' | 'state'} namespace
   * @param {string|undefined} key
   * @public
   */
  notifyChange(identifier: ResourceCacheKey, namespace: 'added' | 'removed', key: null): void;
  notifyChange(identifier: RequestCacheKey, namespace: 'added' | 'updated' | 'removed', key: null): void;
  notifyChange(identifier: ResourceCacheKey, namespace: NotificationType, key: string | null): void;
  notifyChange(
    identifier: ResourceCacheKey | RequestCacheKey,
    namespace: NotificationType | 'added' | 'removed' | 'updated',
    key: string | null
  ): void;
};
