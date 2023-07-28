import { graphFor } from '@ember-data/graph/-private';
import JSONAPICache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import { FetchManager } from '@ember-data/legacy-compat/-private';
import type Model from '@ember-data/model';
import type { ModelStore } from '@ember-data/model/-private/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model/hooks';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import type { Cache } from '@ember-data/types/cache/cache';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';
import type { ModelSchema } from '@ember-data/types/q/ds-model';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

export default class Store extends BaseStore {
  constructor(args: Record<string, unknown>) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
    this.registerSchema(buildSchema(this));
    graphFor(this);
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

  teardownRecord(record: Model): void {
    teardownRecord.call(this, record as Model);
  }

  modelFor(type: string): ModelSchema {
    return modelFor.call(this, type) || super.modelFor(type);
  }

  // TODO @runspired @deprecate records should implement their own serialization if desired
  serializeRecord(record: unknown, options?: Record<string, unknown>): unknown {
    // TODO we used to check if the record was destroyed here
    if (!this._fetchManager) {
      this._fetchManager = new FetchManager(this);
    }

    return this._fetchManager.createSnapshot(recordIdentifierFor(record)).serialize(options);
  }
}
