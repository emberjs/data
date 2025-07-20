import JSONAPICache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { ResourceKey } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import { instantiateRecord, type SchemaRecord, SchemaService, teardownRecord } from '@warp-drive/schema-record';

export default class Store extends DataStore {
  constructor(args: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.use([Fetch]);
    manager.useCache(CacheHandler);
  }

  createSchemaService(): SchemaService {
    return new SchemaService();
  }

  createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createArgs?: Record<string, unknown>): SchemaRecord {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
