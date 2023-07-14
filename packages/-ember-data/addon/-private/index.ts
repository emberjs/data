// public
import ArrayProxy from '@ember/array/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

import Cache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import { instantiateRecord, teardownRecord } from '@ember-data/model';
import { modelFor, ModelSchemaDefinitionService } from '@ember-data/model/-private';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler } from '@ember-data/store';
import type ShimModelClass from '@ember-data/store/-private/legacy-model-support/shim-model-class';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type { DSModel, DSModelSchema, ModelFactory, ModelStore } from '@ember-data/types/q/ds-model';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

export class Store extends BaseStore {
  declare _modelFactoryCache: Record<string, ModelFactory>;
  constructor(args: Record<string, unknown>) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
    this._modelFactoryCache = Object.create(null) as Record<string, ModelFactory>;
    this.registerSchema(new ModelSchemaDefinitionService(this));
  }

  createCache(storeWrapper: CacheStoreWrapper) {
    return new Cache(storeWrapper);
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

  modelFor(type: string): ShimModelClass | DSModelSchema {
    return modelFor.call(this, type) || super.modelFor(type);
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
