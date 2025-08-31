import {
  CacheHandler,
  Fetch,
  recordIdentifierFor,
  RequestManager,
  Store,
  type StoreSetupOptions,
} from '@warp-drive/core';
import { instantiateRecord, registerDerivations, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { Handler } from '@warp-drive/core/request';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { CacheCapabilitiesManager, ModelSchema, ResourceKey } from '@warp-drive/core/types';
import type { TypeFromInstance } from '@warp-drive/core/types/record';
import type { ObjectSchema, ResourceSchema } from '@warp-drive/core/types/schema/fields';

import { LegacyNetworkHandler } from './compat';
import { EmberArrayLikeExtension, EmberObjectArrayExtension, EmberObjectExtension } from './compat/extensions';
import type Model from './model';
import { instantiateRecord as instantiateModel, modelFor, teardownRecord as teardownModel } from './model';
import { DelegatingSchemaService, registerDerivations as registerLegacyDerivations } from './model/migration-support';

export interface LegacyStoreSetupOptions extends Omit<StoreSetupOptions, 'schemas'> {
  linksMode?: boolean;
  schemas?: Array<ResourceSchema | ObjectSchema>;
}

export function useLegacyStore(options: LegacyStoreSetupOptions, StoreKlass: typeof Store = Store): typeof Store {
  return class LegacyConfiguredStore extends StoreKlass {
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
      return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
    }

    // setup legacy network?
  };
}
