import JSONAPICache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import { instantiateRecord, teardownRecord } from '@warp-drive/schema-record/hooks';
import type { SchemaRecord } from '@warp-drive/schema-record/record';
import { SchemaService } from '@warp-drive/schema-record/schema';

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

  instantiateRecord(identifier: StableRecordIdentifier, createArgs?: Record<string, unknown>): SchemaRecord {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: SchemaRecord): void {
    return teardownRecord(record);
  }
}
