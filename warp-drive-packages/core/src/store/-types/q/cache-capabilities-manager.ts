import type { ResourceKey, StableDocumentIdentifier } from '../../../types/identifier.ts';
import type { CacheKeyManager } from '../../-private/managers/cache-key-manager.ts';
import type { NotificationType } from '../../-private/managers/notification-manager.ts';
import type { SchemaService } from './schema-service.ts';

/**
 * CacheCapabilitiesManager provides encapsulated API access to the minimal
 * subset of the Store's functionality that Cache implementations
 * should interact with. It is provided to the Store's `createCache` hook.
 *
 * Cache implementations should not need more than this API provides.
 *
 * This class cannot be directly instantiated.
 *
 * @public
 */
export type CacheCapabilitiesManager = {
  /**
   * Provides access to the CacheKeyManager instance
   * for this Store instance.
   *
   * The CacheKeyManager can be used to peek, generate or
   * retrieve a stable unique identifier for any resource.
   *
   * @public
   */
  cacheKeyManager: CacheKeyManager;

  /** @deprecated use {@link CacheCapabilitiesManager.cacheKeyManager} */
  identifierCache: CacheKeyManager;

  /**
   * DEPRECATED - use the schema property
   *
   * Provides access to the SchemaService instance
   * for this Store instance.
   *
   * The SchemaService can be used to query for
   * information about the schema of a resource.
   *
   * @deprecated use {@link CacheCapabilitiesManager.schema}
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
   * @public
   */
  setRecordId(identifier: ResourceKey, id: string): void;

  /**
   * Signal to the store that the specified record may be considered fully
   * removed from the cache. Generally this means that not only does no
   * data exist for the identified resource, no known relationships still
   * point to it either.
   *
   * @public
   */
  disconnectRecord(identifier: ResourceKey): void;

  /**
   * Use this method to determine if the Store has an instantiated record associated
   * with an identifier.
   *
   * @public
   */
  hasRecord(identifier: ResourceKey): boolean;

  /**
   * Notify subscribers of the NotificationManager that cache state has changed.
   *
   * `attributes` and `relationships` do not require a key, but if one is specified it
   * is assumed to be the name of the attribute or relationship that has been updated.
   *
   * No other namespaces currently expect the `key` argument.
   *
   * @public
   */
  notifyChange(identifier: ResourceKey, namespace: 'added' | 'removed', key: null): void;
  notifyChange(identifier: StableDocumentIdentifier, namespace: 'added' | 'updated' | 'removed', key: null): void;
  notifyChange(identifier: ResourceKey, namespace: NotificationType, key: string | null): void;
  notifyChange(
    identifier: ResourceKey | StableDocumentIdentifier,
    namespace: NotificationType | 'added' | 'removed' | 'updated',
    key: string | null
  ): void;
};
