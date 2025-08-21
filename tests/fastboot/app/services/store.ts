import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import type { CacheCapabilitiesManager, ModelSchema, ResourceKey } from '@warp-drive/core/types';
import { JSONAPICache } from '@warp-drive/json-api';
import type { Model } from '@warp-drive/legacy/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@warp-drive/legacy/model';

export default class AppStore extends Store {
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
