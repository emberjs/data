import type { StableRecordIdentifier } from '@warp-drive/core-types';

import JSONAPICache from '@ember-data/json-api';
import {
  adapterFor,
  cleanup,
  LegacyNetworkHandler,
  normalize,
  pushPayload,
  serializeRecord,
  serializerFor,
} from '@ember-data/legacy-compat';
import type Model from '@ember-data/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model/hooks';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';

export default class Store extends BaseStore {
  constructor(args) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
    this.registerSchema(buildSchema(this));
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs: Record<string, unknown>) {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record: Model) {
    teardownRecord.call(this, record);
  }

  modelFor(type: string) {
    return modelFor.call(this, type) || super.modelFor(type);
  }

  serializeRecord = serializeRecord;
  pushPayload = pushPayload;
  adapterFor = adapterFor;
  serializerFor = serializerFor;
  normalize = normalize;

  destroy() {
    cleanup.call(this);
    super.destroy();
  }
}
