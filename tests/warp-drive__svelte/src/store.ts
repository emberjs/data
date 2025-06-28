import { Fetch, RequestManager, Store as WarpStore } from '@warp-drive/core';
import { instantiateRecord, registerDerivations, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import { JSONAPICache } from '@warp-drive/json-api';
import { CacheHandler } from '@warp-drive/core';
import '@warp-drive/svelte/install';

export default class Store extends WarpStore {
  requestManager = new RequestManager().use([Fetch]).useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);

    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
