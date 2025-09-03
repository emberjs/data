/**
 * @module
 * @mergeModuleWith <project>
 */

import {
  CacheHandler,
  Fetch,
  recordIdentifierFor,
  RequestManager,
  Store,
  type StoreSetupOptions,
} from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import { instantiateRecord, registerDerivations, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { Handler } from '@warp-drive/core/request';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { CacheCapabilitiesManager, ModelSchema, ResourceKey } from '@warp-drive/core/types';
import type { TypeFromInstance } from '@warp-drive/core/types/record';
import type { ObjectSchema, ResourceSchema } from '@warp-drive/core/types/schema/fields';

import type { MinimumAdapterInterface } from './compat';
import {
  adapterFor,
  cleanup,
  LegacyNetworkHandler,
  normalize,
  pushPayload,
  serializeRecord,
  serializerFor,
} from './compat';
import { EmberArrayLikeExtension, EmberObjectArrayExtension, EmberObjectExtension } from './compat/extensions';
import type Model from './model';
import { instantiateRecord as instantiateModel, modelFor, teardownRecord as teardownModel } from './model';
import { DelegatingSchemaService, registerDerivations as registerLegacyDerivations } from './model/migration-support';
import { restoreDeprecatedStoreBehaviors } from './store';

interface _LegacyStoreSetupOptions extends Omit<StoreSetupOptions, 'schemas'> {
  schemas?: Array<ResourceSchema | ObjectSchema>;
}

interface LegacyModelStoreSetupOptions extends _LegacyStoreSetupOptions {
  /**
   * If true, it is presumed that no requests require use of the LegacyNetworkHandler
   * and associated adapters/serializer methods.
   */
  linksMode: true;
  /**
   * if true, all legacy request methods and supporting infrastructure will
   * be available on the store.
   */
  legacyRequests?: false;
}

interface LegacyModelAndNetworkStoreSetupOptions extends _LegacyStoreSetupOptions {
  /**
   * If true, it is presumed that no requests require use of the LegacyNetworkHandler
   * and associated adapters/serializer methods.
   */
  linksMode: false;
  /**
   * if true, all legacy request methods and supporting infrastructure will
   * be available on the store.
   */
  legacyRequests?: false;
}

interface LegacyModelAndNetworkAndRequestStoreSetupOptions extends _LegacyStoreSetupOptions {
  /**
   * If true, it is presumed that no requests require use of the LegacyNetworkHandler
   * and associated adapters/serializer methods.
   */
  linksMode: false;
  /**
   * if true, all legacy request methods and supporting infrastructure will
   * be available on the store.
   */
  legacyRequests: true;
}

export type LegacyStoreSetupOptions =
  | LegacyModelStoreSetupOptions
  | LegacyModelAndNetworkStoreSetupOptions
  | LegacyModelAndNetworkAndRequestStoreSetupOptions;

/**
 * Use the legacy store with the given options.
 */
export function useLegacyStore(options: LegacyModelStoreSetupOptions, StoreKlass?: typeof Store): typeof Store;
export function useLegacyStore(
  options: LegacyModelAndNetworkStoreSetupOptions,
  StoreKlass?: typeof Store
): typeof Store;
export function useLegacyStore(
  options: LegacyModelAndNetworkAndRequestStoreSetupOptions,
  StoreKlass?: typeof Store
): typeof Store;
export function useLegacyStore(options: LegacyStoreSetupOptions, StoreKlass: typeof Store = Store): typeof Store {
  assert(`If legacyRequests is true, linksMode must be false`, !(options.linksMode && options.legacyRequests));
  class LegacyConfiguredStore extends StoreKlass {
    requestManager = new RequestManager()
      .use(
        [options.linksMode ? null : LegacyNetworkHandler, ...(options.handlers ?? []), Fetch].filter(
          Boolean
        ) as Handler[]
      )
      .useCache(CacheHandler);

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

    createSchemaService(): DelegatingSchemaService {
      // prepare for PolarisMode
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

      // Add support for LegacyMode ReactiveResource with Maximal coverage
      // for upgrading from 4.x
      registerLegacyDerivations(schema);
      schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberArrayLikeExtension);
      schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberObjectArrayExtension);
      schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(EmberObjectExtension);

      // Add fallback for Models
      return new DelegatingSchemaService(this, schema);
    }

    createCache(capabilities: CacheCapabilitiesManager) {
      // eslint-disable-next-line new-cap
      return new options.cache(capabilities);
    }

    instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) {
      if (this.schema.isDelegated(key)) {
        return instantiateModel.call(this, key, createArgs);
      }
      return instantiateRecord(this, key, createArgs);
    }

    teardownRecord(record: unknown): void {
      const key = recordIdentifierFor(record);
      if (this.schema.isDelegated(key)) {
        return teardownModel.call(this, record as Model);
      }
      return teardownRecord(record);
    }

    modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
    modelFor(type: string): ModelSchema;
    modelFor(type: string): ModelSchema {
      assertType(this.schema, type);
      assert(
        `modelFor should only be used to lookup legacy models when in linksMode`,
        !options.linksMode || this.schema.isDelegated({ type })
      );
      return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
    }

    adapterFor(this: Store, modelName: string): MinimumAdapterInterface;
    adapterFor(this: Store, modelName: string, _allowMissing: true): MinimumAdapterInterface | undefined;
    adapterFor(this: Store, modelName: string, _allowMissing?: true): MinimumAdapterInterface | undefined {
      assert(
        `useLegacyStore was setup in linksMode. linksMode assumes that all requests have been migrated away from adapters and serializers.`,
        !options.linksMode
      );
      // @ts-expect-error
      return adapterFor.call(this, modelName, _allowMissing);
    }

    serializerFor(this: Store, ...args: Parameters<typeof serializerFor>): ReturnType<typeof serializerFor> {
      assert(
        `useLegacyStore was setup in linksMode. linksMode assumes that all requests have been migrated away from adapters and serializers.`,
        !options.linksMode
      );
      return serializerFor.call(this, ...args);
    }

    pushPayload(this: Store, ...args: Parameters<typeof pushPayload>): ReturnType<typeof pushPayload> {
      assert(
        `useLegacyStore was setup in linksMode. linksMode assumes that all requests have been migrated away from adapters and serializers.`,
        !options.linksMode
      );
      return pushPayload.call(this, ...args);
    }

    normalize(this: Store, ...args: Parameters<typeof normalize>): ReturnType<typeof normalize> {
      assert(
        `useLegacyStore was setup in linksMode. linksMode assumes that all requests have been migrated away from adapters and serializers.`,
        !options.linksMode
      );
      return normalize.call(this, ...args);
    }

    serializeRecord(this: Store, ...args: Parameters<typeof serializeRecord>): ReturnType<typeof serializeRecord> {
      assert(
        `useLegacyStore was setup in linksMode. linksMode assumes that all requests have been migrated away from adapters and serializers.`,
        !options.linksMode
      );
      return serializeRecord.call(this, ...args);
    }

    destroy() {
      if (!options.linksMode) {
        cleanup.call(this);
      }
      super.destroy();
    }
  }

  if (options.legacyRequests) {
    restoreDeprecatedStoreBehaviors(LegacyConfiguredStore);
  }

  return LegacyConfiguredStore;
}

function assertType(schema: DelegatingSchemaService, type: string) {
  assert(`Expected type ${type} to be a valid ResourceType`, schema.hasResource({ type }));
}
