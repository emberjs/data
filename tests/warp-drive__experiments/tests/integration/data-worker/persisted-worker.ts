import Cache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CachePolicy } from '@ember-data/request-utils';
import Store from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { CacheHandler, DataWorker } from '@warp-drive/experiments/data-worker';
import { SchemaService } from '@warp-drive/schema-record/schema';

import { UserSchema } from './user-schema';

const requestManager = new RequestManager();
const policy = new CachePolicy({
  apiCacheHardExpires: 1000,
  apiCacheSoftExpires: 500,
});
requestManager.use([Fetch]);
requestManager.useCache(CacheHandler);

class WorkerStore extends Store {
  requestManager = requestManager;
  lifetimes = policy;

  createCache(capabilities: CacheCapabilitiesManager) {
    return new Cache(capabilities);
  }

  createSchemaService() {
    const schema = new SchemaService();
    schema.registerResource(UserSchema);
    return schema;
  }
}

new DataWorker(WorkerStore, { persisted: true, scope: 'persisted-worker-test' });
