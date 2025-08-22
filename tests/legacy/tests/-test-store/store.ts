import { getOwner } from '@ember/owner';

import { CacheHandler, Fetch, RequestManager, Store as BaseStore } from '@warp-drive/core';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import type { ResourceKey } from '@warp-drive/core-types';
import { JSONAPICache } from '@warp-drive/json-api';
import { RESTAdapter } from '@warp-drive/legacy/adapter/rest';
import { LegacyNetworkHandler, pushPayload, serializeRecord } from '@warp-drive/legacy/compat';
import { registerDerivations } from '@warp-drive/legacy/model/migration-support';
import { RESTSerializer } from '@warp-drive/legacy/serializer/rest';

class ApplicationAdapter extends RESTAdapter {
  host = `https://${window.location.hostname}:${Number(window.location.port) + 1}`;
  shouldBackgroundReloadRecord() {
    return false;
  }
}

export class Store extends BaseStore {
  requestManager = new RequestManager().use([LegacyNetworkHandler, Fetch]).useCache(CacheHandler);
  _adapter?: ApplicationAdapter;
  _serializer?: typeof RESTSerializer;
  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }

  adapterFor() {
    if (!this._adapter) {
      const owner = getOwner(this)!;
      owner.register(`adapter:application`, ApplicationAdapter);
      this._adapter = owner.lookup(`adapter:application`) as ApplicationAdapter;
    }
    return this._adapter;
  }

  serializerFor() {
    if (!this._serializer) {
      const owner = getOwner(this)!;
      owner.register(`serializer:application`, RESTSerializer);
      this._serializer = owner.lookup(`serializer:application`) as typeof RESTSerializer;
    }
    return this._serializer;
  }
  serializeRecord = serializeRecord;
  pushPayload = pushPayload;
}
