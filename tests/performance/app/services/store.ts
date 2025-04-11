import JSONAPICache from '@ember-data/json-api';
import type Model from '@ember-data/model';
import { instantiateRecord, teardownRecord } from '@ember-data/model';
import { buildSchema, modelFor } from '@ember-data/model/hooks';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema } from '@ember-data/store/types';
import type { ResourceCacheKey } from '@warp-drive/core-types';
import type { RequestContext, NextFn } from '@ember-data/request';

export default class Store extends DataStore {
  requestManager = new RequestManager()
    .use([
      {
        request<T>({ request }: RequestContext, next: NextFn<T>) {
          if (request.op === 'deleteRecord') {
            return Promise.resolve({ data: null }) as Promise<T>;
          }
          return next(request);
        },
      },
      Fetch,
    ])
    .useCache(CacheHandler);

  createSchemaService(): ReturnType<typeof buildSchema> {
    return buildSchema(this);
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceCacheKey, createRecordArgs: { [key: string]: unknown }) {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record: Model) {
    return teardownRecord.call(this, record);
  }

  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
