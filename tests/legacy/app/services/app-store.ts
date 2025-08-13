import JSONAPICache from '@ember-data/json-api';
import {
  LegacyNetworkHandler,
  adapterFor,
  pushPayload,
  serializeRecord,
  serializerFor,
} from '@ember-data/legacy-compat';
import { registerDerivations } from '@ember-data/model/migration-support';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { ResourceKey } from '@warp-drive/core-types';
import {
  SchemaService,
  instantiateRecord,
  teardownRecord,
} from '@warp-drive/schema-record';

export class Store extends BaseStore {
  requestManager = new RequestManager()
    .use([LegacyNetworkHandler, Fetch])
    .useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(
    identifier: ResourceKey,
    createArgs?: Record<string, unknown>
  ) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }

  adapterFor = adapterFor;
  serializerFor = serializerFor;
  serializeRecord = serializeRecord;
  pushPayload = pushPayload;
}
