import { Fetch, RequestManager, Store } from '@warp-drive/core';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import { CacheHandler, DataWorker } from '@warp-drive/experiments/data-worker';
import { JSONAPICache } from '@warp-drive/json-api';
import { SchemaService } from '@warp-drive/schema-record';

import { UserSchema } from './user-schema';

const requestManager = new RequestManager();
const policy = new DefaultCachePolicy({
  apiCacheHardExpires: 1000,
  apiCacheSoftExpires: 500,
});
requestManager.use([Fetch]);
requestManager.useCache(CacheHandler);

class WorkerStore extends Store {
  requestManager = requestManager;
  lifetimes = policy;

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  createSchemaService() {
    const schema = new SchemaService();
    schema.registerResource(UserSchema);
    return schema;
  }
}

new DataWorker(WorkerStore, { persisted: true, scope: 'persisted-worker-test' });
