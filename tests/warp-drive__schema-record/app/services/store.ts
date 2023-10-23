import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { instantiateRecord, teardownRecord } from '@warp-drive/schema-record/hooks';
import type { SchemaRecord } from '@warp-drive/schema-record/record';

import JSONAPICache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
import type { Cache } from '@ember-data/store/-types/cache/cache';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';

export default class Store extends DataStore {
  constructor(args: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.use([Fetch]);
    manager.useCache(CacheHandler);
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
