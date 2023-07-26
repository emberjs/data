import { graphFor } from '@ember-data/graph/-private';
import JSONAPICache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import type Model from '@ember-data/model';
import type { ModelStore } from '@ember-data/model/-private/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model/hooks';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler } from '@ember-data/store';
import type { Cache } from '@ember-data/types/cache/cache';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';
import type { ModelSchema } from '@ember-data/types/q/ds-model';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

export default class Store extends BaseStore {
  constructor(args: Record<string, unknown>) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
    this.registerSchema(buildSchema(this));
    this._graph = graphFor(this);
  }

  createCache(storeWrapper: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(storeWrapper);
  }

  instantiateRecord(
    this: ModelStore,
    identifier: StableRecordIdentifier,
    createRecordArgs: Record<string, unknown>
  ): Model {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record: RecordInstance): void {
    teardownRecord.call(this, record as Model);
  }

  modelFor(type: string): ModelSchema {
    return modelFor.call(this, type) || super.modelFor(type);
  }
}
