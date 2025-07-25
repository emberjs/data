import JSONAPICache from '@ember-data/json-api';
import type Model from '@ember-data/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema } from '@ember-data/store/types';
import type { ResourceKey } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { TypeFromInstance } from '@warp-drive/core-types/record';

export default class Store extends DataStore {
  constructor(args: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.use([Fetch]);
    manager.useCache(CacheHandler);
  }

  createSchemaService(): ReturnType<typeof buildSchema> {
    return buildSchema(this);
  }

  override createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }

  override instantiateRecord(key: ResourceKey, createRecordArgs: { [key: string]: unknown }): unknown {
    return instantiateRecord.call(this, key, createRecordArgs);
  }

  override teardownRecord(record: Model): void {
    return teardownRecord.call(this, record);
  }

  override modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  override modelFor(type: string): ModelSchema;
  override modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
