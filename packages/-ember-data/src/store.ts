import { deprecate } from '@ember/debug';

import JSONAPICache from '@ember-data/json-api';
import type { MinimumAdapterInterface } from '@ember-data/legacy-compat';
import {
  adapterFor,
  cleanup,
  LegacyNetworkHandler,
  normalize,
  pushPayload,
  serializeRecord,
  serializerFor,
} from '@ember-data/legacy-compat';
import type { FetchManager } from '@ember-data/legacy-compat/-private';
import type Model from '@ember-data/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema, SchemaService } from '@ember-data/store/types';
import { ENABLE_LEGACY_REQUEST_METHODS } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';
import type { ResourceKey } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { TypeFromInstance } from '@warp-drive/core-types/record';

function hasRequestManager(store: BaseStore): boolean {
  return 'requestManager' in store;
}

export default class Store extends BaseStore {
  declare _fetchManager: FetchManager;

  constructor(args?: Record<string, unknown>) {
    super(args);

    if (!hasRequestManager(this)) {
      this.requestManager = new RequestManager();
      this.requestManager.use(ENABLE_LEGACY_REQUEST_METHODS ? [LegacyNetworkHandler, Fetch] : [Fetch]);
    }
    this.requestManager.useCache(CacheHandler);
  }

  createSchemaService(): SchemaService {
    return buildSchema(this);
  }

  createCache(storeWrapper: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(storeWrapper);
  }

  instantiateRecord(key: ResourceKey, createRecordArgs: Record<string, unknown>): Model {
    return instantiateRecord.call(this, key, createRecordArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord.call(this, record as Model);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }

  adapterFor(this: Store, modelName: string): MinimumAdapterInterface;
  adapterFor(this: Store, modelName: string, _allowMissing: true): MinimumAdapterInterface | undefined;
  adapterFor(this: Store, modelName: string, _allowMissing?: true): MinimumAdapterInterface | undefined {
    if (!ENABLE_LEGACY_REQUEST_METHODS) {
      assert(
        `You cannot use store.adapterFor when ENABLE_LEGACY_REQUEST_METHODS is false without explicitly registering the adapterFor hook from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false
      );
    } else {
      deprecate(
        `store.adapterFor is deprecated, please use store.request to perform requests and builders/handlers/utils to produce and process them, or explicitly register the adapterFor hook and LegacyNetworkHandler from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false,
        {
          id: 'warp-drive:deprecate-legacy-request-methods',
          until: '6.0',
          for: '@warp-drive/core',
          url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
          since: {
            enabled: '5.7',
            available: '5.7',
          },
        }
      );

      // @ts-expect-error
      return adapterFor.call(this, modelName, _allowMissing);
    }
  }

  serializerFor = (...args: Parameters<typeof serializerFor>): ReturnType<typeof serializerFor> => {
    if (!ENABLE_LEGACY_REQUEST_METHODS) {
      assert(
        `You cannot use store.serializerFor when ENABLE_LEGACY_REQUEST_METHODS is false without explicitly registering the serializerFor hook from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false
      );
    } else {
      deprecate(
        `store.serializerFor is deprecated, please use store.request to perform requests and builders/handlers/utils to produce and process them, or explicitly register the serializerFor hook and LegacyNetworkHandler from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false,
        {
          id: 'warp-drive:deprecate-legacy-request-methods',
          until: '6.0',
          for: '@warp-drive/core',
          url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
          since: {
            enabled: '5.7',
            available: '5.7',
          },
        }
      );
      return serializerFor.call(this, ...args);
    }
  };

  pushPayload = (...args: Parameters<typeof pushPayload>): ReturnType<typeof pushPayload> => {
    if (!ENABLE_LEGACY_REQUEST_METHODS) {
      assert(
        `You cannot use store.pushPayload when ENABLE_LEGACY_REQUEST_METHODS is false without explicitly registering the pushPayload hook from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false
      );
    } else {
      deprecate(
        `store.pushPayload is deprecated, please use store.request to perform requests and builders/handlers/utils to produce and process them, or explicitly register the pushPayload and serializerFor hooks from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false,
        {
          id: 'warp-drive:deprecate-legacy-request-methods',
          until: '6.0',
          for: '@warp-drive/core',
          url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
          since: {
            enabled: '5.7',
            available: '5.7',
          },
        }
      );
      return pushPayload.call(this, ...args);
    }
  };

  normalize = (...args: Parameters<typeof normalize>): ReturnType<typeof normalize> => {
    if (!ENABLE_LEGACY_REQUEST_METHODS) {
      assert(
        `You cannot use store.normalize when ENABLE_LEGACY_REQUEST_METHODS is false without explicitly registering the normalize hook from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false
      );
    } else {
      deprecate(
        `store.normalize is deprecated, please use store.request to perform requests and builders/handlers/utils to produce and process them, or explicitly register the normalize and serializerFor hooks from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false,
        {
          id: 'warp-drive:deprecate-legacy-request-methods',
          until: '6.0',
          for: '@warp-drive/core',
          url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
          since: {
            enabled: '5.7',
            available: '5.7',
          },
        }
      );
      return normalize.call(this, ...args);
    }
  };

  serializeRecord = (...args: Parameters<typeof serializeRecord>): ReturnType<typeof serializeRecord> => {
    if (!ENABLE_LEGACY_REQUEST_METHODS) {
      assert(
        `You cannot use store.serializeRecord when ENABLE_LEGACY_REQUEST_METHODS is false without explicitly registering the serializeRecord hook from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false
      );
    } else {
      deprecate(
        `store.serializeRecord is deprecated, please use store.request to perform requests and builders/handlers/utils to produce and process them, or explicitly register the serializeRecord and serializerFor hooks from @ember-data/legacy-compat or @warp-drive/legacy.`,
        false,
        {
          id: 'warp-drive:deprecate-legacy-request-methods',
          until: '6.0',
          for: '@warp-drive/core',
          url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
          since: {
            enabled: '5.7',
            available: '5.7',
          },
        }
      );
      return serializeRecord.call(this, ...args);
    }
  };

  destroy(): void {
    cleanup.call(this);
    super.destroy();
  }
}
