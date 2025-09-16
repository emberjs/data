import type Owner from '@ember/owner';
import { getOwner } from '@ember/owner';

import { CacheHandler, Fetch, RequestManager, Store as BaseStore } from '@warp-drive/core';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import type { ResourceKey } from '@warp-drive/core-types';
import { installAdapterFor, MockServerHandler } from '@warp-drive/holodeck';
import { JSONAPICache } from '@warp-drive/json-api';
import type { LegacyModelAndNetworkAndRequestStoreSetupOptions, LegacyStoreSetupOptions } from '@warp-drive/legacy';
import { useLegacyStore } from '@warp-drive/legacy';
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      owner.register(`serializer:application`, RESTSerializer);
      this._serializer = owner.lookup(`serializer:application`) as typeof RESTSerializer;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this._serializer;
  }
  serializeRecord = serializeRecord;
  pushPayload = pushPayload;
}

export function createTestStore(options: Partial<LegacyStoreSetupOptions> = {}, context: { owner: Owner }): Store {
  const config = Object.assign(
    {
      linksMode: false,
      legacyRequests: true,
      modelFragments: true,
      cache: JSONAPICache,
      handlers: [new MockServerHandler(context)],
      schemas: [],
    },
    options
  );
  const AppStore = useLegacyStore(config as LegacyModelAndNetworkAndRequestStoreSetupOptions);
  class TestStore extends AppStore {
    _adapter?: ApplicationAdapter;
    _serializer?: typeof RESTSerializer;

    constructor(arg: unknown) {
      super(arg);
      context.owner.register('adapter:application', ApplicationAdapter);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      context.owner.register('serializer:application', RESTSerializer);
    }

    adapterFor() {
      if (!this._adapter) {
        this._adapter = context.owner.lookup(`adapter:application`) as ApplicationAdapter;
      }
      return this._adapter;
    }

    serializerFor() {
      if (!this._serializer) {
        this._serializer = context.owner.lookup(`serializer:application`) as typeof RESTSerializer;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this._serializer;
    }
  }

  // @ts-expect-error - unregister is not in the type definitions
  context.owner.unregister('service:store');
  context.owner.register('service:store', TestStore);
  const store = context.owner.lookup('service:store') as TestStore;
  installAdapterFor(context, store);

  // TODO figure out why this cast is necessary
  return store as Store;
}
