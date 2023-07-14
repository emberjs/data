// public
import ArrayProxy from '@ember/array/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

import { graphFor } from '@ember-data/graph/-private';
import JSONAPICache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import { FetchManager } from '@ember-data/legacy-compat/-private';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model/hooks';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import { Cache } from '@ember-data/types/cache/cache';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type { DSModel, ModelSchema, ModelStore } from '@ember-data/types/q/ds-model';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

export class Store extends BaseStore {
  constructor(args: Record<string, unknown>) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
    this.registerSchema(buildSchema(this));
    this._graph = graphFor(this);
  }

  createCache(storeWrapper: CacheStoreWrapper): Cache {
    return new JSONAPICache(storeWrapper);
  }

  instantiateRecord(
    this: ModelStore,
    identifier: StableRecordIdentifier,
    createRecordArgs: Record<string, unknown>
  ): DSModel {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record: RecordInstance): void {
    teardownRecord.call(this, record as DSModel);
  }

  modelFor(type: string): ModelSchema {
    return modelFor.call(this, type) || super.modelFor(type);
  }

  // TODO @runspired @deprecate records should implement their own serialization if desired
  serializeRecord(record: RecordInstance, options?: Record<string, unknown>): unknown {
    // TODO we used to check if the record was destroyed here
    if (!this._fetchManager) {
      this._fetchManager = new FetchManager(this);
    }

    return this._fetchManager.createSnapshot(recordIdentifierFor(record)).serialize(options);
  }
}

export { default as DS } from './core';
export { Errors } from '@ember-data/model/-private';
export { Snapshot } from '@ember-data/legacy-compat/-private';

// `ember-data-model-fragments' and `ember-data-change-tracker` rely on `normalizeModelName`
export { RecordArrayManager, coerceId } from '@ember-data/store/-private';
export { ManyArray, PromiseManyArray } from '@ember-data/model/-private';
export { SnapshotRecordArray } from '@ember-data/legacy-compat/-private';

export const PromiseArray = ArrayProxy.extend(PromiseProxyMixin);
export const PromiseObject = ObjectProxy.extend(PromiseProxyMixin);
