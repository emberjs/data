import JSONAPICache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/schema-record';

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

  override createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  override instantiateRecord(identifier: StableRecordIdentifier, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  override teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
