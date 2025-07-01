import { CacheHandler, Fetch, RequestManager, Store as BaseStore } from '@warp-drive/core';
import type { CacheCapabilitiesManager, ModelSchema } from '@warp-drive/core/types';
import type { StableRecordIdentifier } from '@warp-drive/core/types/identifier';
import type { TypeFromInstance } from '@warp-drive/core/types/record';
import { JSONAPICache } from '@warp-drive/json-api';
import {
  adapterFor,
  cleanup,
  LegacyNetworkHandler,
  normalize,
  pushPayload,
  serializeRecord,
  serializerFor,
} from '@warp-drive/legacy/compat';
import type Model from '@warp-drive/legacy/model';
import { buildSchema, instantiateRecord, modelFor, teardownRecord } from '@warp-drive/legacy/model';

export default class Store extends BaseStore {
  constructor(args: unknown) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
  }

  createSchemaService(): ReturnType<typeof buildSchema> {
    return buildSchema(this);
  }

  override createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  override instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs: Record<string, unknown>): Model {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  override teardownRecord(record: Model) {
    teardownRecord.call(this, record);
  }

  override modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  override modelFor(type: string): ModelSchema;
  override modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }

  serializeRecord = serializeRecord;
  pushPayload = pushPayload;
  adapterFor = adapterFor;
  serializerFor = serializerFor;
  normalize = normalize;

  override destroy() {
    cleanup.call(this);
    super.destroy();
  }
}
