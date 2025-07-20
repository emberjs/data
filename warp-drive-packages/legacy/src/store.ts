import type { Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import type { LegacyLiveArray, LegacyQueryArray } from '@warp-drive/core/store/-private';
import { constructResource, ensureStringId, recordIdentifierFor, storeFor } from '@warp-drive/core/store/-private';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { OpaqueRecordInstance, TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import { SkipCache } from '@warp-drive/core/types/request';
import type { ResourceIdentifierObject } from '@warp-drive/core/types/spec/json-api-raw';

import { isMaybeIdentifier } from './compat/builders/utils.ts';
import { normalizeModelName } from './model/-private/util.ts';
import type {
  FindAllOptions,
  FindRecordOptions,
  LegacyResourceQuery,
  ModelSchema,
  QueryOptions,
} from './store/-private.ts';
import { getShimClass, preloadData, RecordReference, resourceIsFullyDeleted } from './store/-private.ts';

export function restoreDeprecatedStoreBehaviors(StoreKlass: typeof Store): void {
  StoreKlass.prototype.findRecord = function (
    resource: string | ResourceIdentifierObject,
    id?: string | number | FindRecordOptions,
    options?: FindRecordOptions
  ): Promise<unknown> {
    assert(
      `Attempted to call store.findRecord(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );

    assert(
      `You need to pass a modelName or resource identifier as the first argument to the store's findRecord method`,
      resource
    );
    if (isMaybeIdentifier(resource)) {
      options = id as FindRecordOptions;
    } else {
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${resource}`,
        typeof resource === 'string'
      );
      const type = normalizeModelName(resource);
      const normalizedId = ensureStringId(id as string | number);
      resource = constructResource(type, normalizedId);
    }

    const identifier = this.cacheKeyManager.getOrCreateRecordIdentifier(resource);
    options = options || {};

    if (options.preload) {
      // force reload if we preload to ensure we don't resolve the promise
      // until we are complete, else we will end up background-reloading
      // even for initial load.
      if (!this._instanceCache.recordIsLoaded(identifier)) {
        options.reload = true;
      }
      this._join(() => {
        preloadData(this, identifier, options.preload!);
      });
    }

    const promise = this.request<OpaqueRecordInstance>({
      op: 'findRecord',
      data: {
        record: identifier,
        options,
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => {
      return document.content;
    });
  };

  StoreKlass.prototype.findAll = function <T>(
    type: TypeFromInstance<T> | string,
    options: FindAllOptions = {}
  ): Promise<LegacyLiveArray<T>> {
    assert(
      `Attempted to call store.findAll(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`You need to pass a model name to the store's findAll method`, type);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    const promise = this.request<LegacyLiveArray<T>>({
      op: 'findAll',
      data: {
        type: normalizeModelName(type),
        options: options || {},
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => document.content);
  };

  StoreKlass.prototype.query = function (
    type: string,
    query: LegacyResourceQuery,
    options: QueryOptions = {}
  ): Promise<LegacyQueryArray> {
    assert(
      `Attempted to call store.query(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`You need to pass a model name to the store's query method`, type);
    assert(`You need to pass a query hash to the store's query method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    const promise = this.request<LegacyQueryArray>({
      op: 'query',
      data: {
        type: normalizeModelName(type),
        query,
        options: options,
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => document.content);
  };

  StoreKlass.prototype.queryRecord = function (
    type: string,
    query: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<OpaqueRecordInstance | null> {
    assert(
      `Attempted to call store.queryRecord(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`You need to pass a model name to the store's queryRecord method`, type);
    assert(`You need to pass a query hash to the store's queryRecord method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    const promise = this.request<OpaqueRecordInstance | null>({
      op: 'queryRecord',
      data: {
        type: normalizeModelName(type),
        query,
        options: options || {},
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => document.content);
  };

  // @ts-expect-error RecordReference private store shouldn't matter
  StoreKlass.prototype.getReference = function (
    resource: string | ResourceIdentifierObject,
    id: string | number
  ): RecordReference {
    assert(
      `Attempted to call store.getReference(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );

    let resourceIdentifier: ResourceIdentifierObject;
    if (arguments.length === 1 && isMaybeIdentifier(resource)) {
      resourceIdentifier = resource;
    } else {
      const type = normalizeModelName(resource as string);
      const normalizedId = ensureStringId(id);
      resourceIdentifier = constructResource(type, normalizedId);
    }

    assert(
      'getReference expected to receive either a resource identifier or type and id as arguments',
      isMaybeIdentifier(resourceIdentifier)
    );

    const identifier: ResourceKey = this.cacheKeyManager.getOrCreateRecordIdentifier(resourceIdentifier);

    const cache = upgradeInstanceCaches(this._instanceCache.__instances).reference;
    let reference = cache.get(identifier);

    if (!reference) {
      reference = new RecordReference(this, identifier);
      cache.set(identifier, reference);
    }
    return reference;
  };

  StoreKlass.prototype.modelFor = function <T>(
    type: T extends TypedRecordInstance ? TypeFromInstance<T> : string
  ): ModelSchema<T> {
    assert(`Attempted to call store.modelFor(), but the store instance has already been destroyed.`, !this.isDestroyed);
    assert(`You need to pass <type> to the store's modelFor method`, typeof type === 'string' && type.length);
    assert(`No model was found for '${type}' and no schema handles the type`, this.schema.hasResource({ type }));

    return getShimClass<T>(this, type);
  };

  StoreKlass.prototype.saveRecord = function <T>(record: T, options: Record<string, unknown> = {}): Promise<T> {
    assert(
      `Attempted to call store.saveRecord(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`Unable to initiate save for a record in a disconnected state`, storeFor(record, true));
    const identifier = recordIdentifierFor(record);
    const cache = this.cache;

    if (!identifier) {
      // this commonly means we're disconnected
      // but just in case we reject here to prevent bad things.
      return Promise.reject(new Error(`Record Is Disconnected`));
    }
    assert(
      `Cannot initiate a save request for an unloaded record: ${identifier.lid}`,
      this._instanceCache.recordIsLoaded(identifier)
    );
    if (resourceIsFullyDeleted(this._instanceCache, identifier)) {
      return Promise.resolve(record);
    }

    if (!options) {
      options = {};
    }
    let operation: 'createRecord' | 'deleteRecord' | 'updateRecord' = 'updateRecord';

    if (cache.isNew(identifier)) {
      operation = 'createRecord';
    } else if (cache.isDeleted(identifier)) {
      operation = 'deleteRecord';
    }

    const request = {
      op: operation,
      data: {
        options,
        record: identifier,
      },
      records: [identifier],
      cacheOptions: { [SkipCache]: true },
    };

    return this.request<T>(request).then((document) => document.content);
  };
}

export { Store };

type Caches = Store['_instanceCache']['__instances'];
function upgradeInstanceCaches(cache: Caches): Caches & { reference: WeakMap<ResourceKey, RecordReference> } {
  const withReferences = cache as Caches & { reference: WeakMap<ResourceKey, RecordReference> };
  if (!withReferences.reference) {
    withReferences.reference = new WeakMap();
  }

  return withReferences;
}
