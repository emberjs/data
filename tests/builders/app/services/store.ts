import JSONAPICache from '@ember-data/json-api';
import type Model from '@ember-data/model';
import { instantiateRecord, teardownRecord } from '@ember-data/model';
import { buildSchema, modelFor } from '@ember-data/model/hooks';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import DataStore, { CacheHandler } from '@ember-data/store';
// @ts-expect-error FIXME: IDK where to get this
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';
import type { Cache } from '@ember-data/types/q/cache';
import type { ModelSchema } from '@ember-data/types/q/ds-model';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import { RecordInstance } from '@ember-data/types/q/record-instance';

export default class Store extends DataStore {
  constructor(args: Record<string, unknown> | undefined) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.use([Fetch]);
    manager.useCache(CacheHandler);

    this.registerSchema(buildSchema(this));
  }

  override createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }

  override instantiateRecord(
    identifier: StableRecordIdentifier,
    createRecordArgs: { [key: string]: unknown }
  ): RecordInstance {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  override teardownRecord(record: Model): void {
    return teardownRecord.call(this, record);
  }

  // @ts-expect-error FIXME:
  override modelFor(type: string): ModelSchema {
    return modelFor.call(this, type)!;
  }
}
