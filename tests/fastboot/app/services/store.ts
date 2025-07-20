import JSONAPICache from '@ember-data/json-api';
import type Model from '@ember-data/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema } from '@ember-data/store/types';
import type { ResourceKey } from '@warp-drive/core-types';

export default class Store extends DataStore {
  requestManager = new RequestManager().use([Fetch]).useCache(CacheHandler);

  createSchemaService(): ReturnType<typeof buildSchema> {
    return buildSchema(this);
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createRecordArgs: { [key: string]: unknown }) {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record: Model) {
    return teardownRecord.call(this, record);
  }

  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
