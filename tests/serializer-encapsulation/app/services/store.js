import JSONAPICache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import { FetchManager } from '@ember-data/legacy-compat/-private';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model/hooks';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler, recordIdentifierFor } from '@ember-data/store';

export default class Store extends BaseStore {
  constructor(args) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
    this.registerSchema(buildSchema(this));
  }

  createCache(storeWrapper) {
    return new JSONAPICache(storeWrapper);
  }

  instantiateRecord(identifier, createRecordArgs) {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record) {
    teardownRecord.call(this, record);
  }

  modelFor(type) {
    return modelFor.call(this, type) || super.modelFor(type);
  }

  // TODO @runspired @deprecate records should implement their own serialization if desired
  serializeRecord(record, options) {
    // TODO we used to check if the record was destroyed here
    if (!this._fetchManager) {
      this._fetchManager = new FetchManager(this);
    }

    return this._fetchManager.createSnapshot(recordIdentifierFor(record)).serialize(options);
  }
}
