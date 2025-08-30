/**
 * @module
 * @mergeModuleWith <project>
 */

import type { CAUTION_MEGA_DANGER_ZONE_Extension } from './reactive.ts';
import { instantiateRecord, registerDerivations, SchemaService, teardownRecord } from './reactive.ts';
import type { ReactiveDocument } from './reactive/-private/document.ts';
import type { Handler } from './request.ts';
import { Fetch } from './request/-private/fetch.ts';
import { RequestManager } from './request/-private/manager.ts';
import { DefaultCachePolicy } from './store.ts';
import { CacheHandler, type CachePolicy, Store } from './store/-private.ts';
import type { CacheCapabilitiesManager, ResourceKey } from './types.ts';
import type { Cache } from './types/cache.ts';
import { getRuntimeConfig, setLogging } from './types/runtime.ts';
import type { Derivation, HashFn, Transformation } from './types/schema/concepts.ts';
import type { ObjectSchema, ResourceSchema, Trait } from './types/schema/fields.ts';

export { Fetch, RequestManager };

// @ts-expect-error adding to globalThis
globalThis.setWarpDriveLogging = setLogging;

// @ts-expect-error adding to globalThis
globalThis.getWarpDriveRuntimeConfig = getRuntimeConfig;

export { Store, CacheHandler, type CachePolicy };

export { type StoreRequestContext, type StoreRequestInput, recordIdentifierFor, storeFor } from './store/-private.ts';

/**
 * @deprecated use `ReactiveDocument` instead
 */
export type Document<T> = ReactiveDocument<T>;

export type {
  DocumentCacheOperation,
  CacheOperation,
  NotificationType,
} from './store/-private/managers/notification-manager.ts';

export {
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
  setKeyInfoForResource,
} from './store/-private/managers/cache-key-manager.ts';

/**
 * Options for setting up a Store instance with `useRecommendedStore`.
 */
export interface StoreSetupOptions {
  /**
   * The Cache implementation to use
   */
  cache: new (capabilities: CacheCapabilitiesManager) => Cache;
  /**
   * The Cache policy to use.
   *
   * Defaults to {@link DefaultCachePolicy} configured to
   * respect `Expires`, `X-WarpDrive-Expires`, and `Cache-Control` headers
   * with a fallback to 30s soft expiration and 15m hard expiration.
   */
  policy?: CachePolicy;
  /**
   * The request handlers to use. {@link Fetch} will automatically
   * be added to the end of the handler chain and {@link CacheHandler}
   * will automatically be added as the cache handler.
   */
  handlers?: Handler[];
  /**
   * Schemas describing the structure of your resource data.
   *
   * See {@link ResourceSchema} and {@link ObjectSchema} for more information.
   */
  schemas?: Array<ResourceSchema | ObjectSchema>;
  /**
   * {@link Trait | Traits} to use with {@link ResourceSchema | Resource Schemas}
   */
  traits?: Trait[];
  /**
   * {@link Derivation | Derivations} to use for derived fields.
   */
  derivations?: Derivation[];
  /**
   * {@link Transformation | Transformations} to use for transforming fields.
   */
  transformations?: Transformation[];
  /**
   * {@link HashFn | Hash Functions} to use for embedded object identity and polymorphic type calculations
   */
  hashFns?: HashFn[];
  /**
   * {@link CAUTION_MEGA_DANGER_ZONE_Extension | Extensions} to use with resources, objects and arrays
   * to provide custom behaviors and capabilities that are not described by Schema.
   *
   * This feature should only be used during a transition period to support migrating towards
   * schemas from existing Model and ModelFragments implementations.
   */
  CAUTION_MEGA_DANGER_ZONE_extensions?: CAUTION_MEGA_DANGER_ZONE_Extension[];
}

/**
 * Creates a configured Store class with recommended defaults
 * for schema handling, reactivity, caching, and request management.
 *
 * ```ts
 * import { useRecommendedStore } from '@warp-drive/core';
 * import { JSONAPICache } from '@warp-drive/json-api';
 *
 * export const Store = useRecommendedStore({
 *   cache: JSONAPICache,
 *   schemas: [],
 * });
 * ```
 */
export function useRecommendedStore(options: StoreSetupOptions, StoreKlass: typeof Store = Store): typeof Store {
  return class ConfiguredStore extends StoreKlass {
    requestManager = new RequestManager().use([...(options.handlers ?? []), Fetch]).useCache(CacheHandler);

    lifetimes =
      options.policy ??
      new DefaultCachePolicy({
        apiCacheHardExpires: 15 * 60 * 1000, // 15 minutes
        apiCacheSoftExpires: 1 * 30 * 1000, // 30 seconds
        constraints: {
          headers: {
            'X-WarpDrive-Expires': true,
            'Cache-Control': true,
            Expires: true,
          },
        },
      });

    createSchemaService() {
      const schema = new SchemaService();
      registerDerivations(schema);
      if (options.schemas) schema.registerResources(options.schemas);

      if (options.traits) {
        for (const trait of options.traits) {
          schema.registerTrait(trait);
        }
      }

      if (options.derivations) {
        for (const derivation of options.derivations) {
          schema.registerDerivation(derivation);
        }
      }

      if (options.transformations) {
        for (const transformation of options.transformations) {
          schema.registerTransformation(transformation);
        }
      }

      if (options.hashFns) {
        for (const hashFn of options.hashFns) {
          schema.registerHashFn(hashFn);
        }
      }

      if (options.CAUTION_MEGA_DANGER_ZONE_extensions) {
        for (const extension of options.CAUTION_MEGA_DANGER_ZONE_extensions) {
          schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(extension);
        }
      }

      return schema;
    }

    createCache(capabilities: CacheCapabilitiesManager) {
      // eslint-disable-next-line new-cap
      return new options.cache(capabilities);
    }

    instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) {
      return instantiateRecord(this, key, createArgs);
    }

    teardownRecord(record: unknown): void {
      return teardownRecord(record);
    }
  };
}
