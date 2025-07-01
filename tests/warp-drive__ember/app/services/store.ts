import { JSONAPICache } from '@warp-drive/json-api';
import { Fetch, RequestManager, Store as DataStore, CacheHandler } from '@warp-drive/core';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import type { StableRecordIdentifier } from '@warp-drive/core/types/identifier';
import type { Cache } from '@warp-drive/core/types/cache';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/core/reactive';

export default class Store extends DataStore {
  constructor(args: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.use([Fetch]);
    manager.useCache(CacheHandler);
  }

  createSchemaService() {
    return new SchemaService();
  }

  createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: StableRecordIdentifier, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
