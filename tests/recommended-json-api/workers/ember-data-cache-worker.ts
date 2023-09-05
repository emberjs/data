import DataWorker, { CacheHandler } from '@ember-data/data-worker';
import JSONAPICache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { LifetimesService } from '@ember-data/request-utils';
import DataStore from '@ember-data/store';
import type { Cache } from '@ember-data/types/cache/cache';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';

const CONFIG = {
  apiCacheHardExpires: 120_000, // 2 minutes
  apiCacheSoftExworkpires: 30_000, // 30 seconds
};

class Store extends DataStore {
  constructor(args: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.use([Fetch]);

    // this CacheHandler differs from the Store's in that it does not
    // instantiate records for the response. It insteads takes the
    // ResponseDocument from the cache and caches the request, document
    // and resource data involved into indexeddb before returning the
    // original raw response
    manager.useCache(CacheHandler);

    // our indexeddb cache will respect lifetimes, so registering
    // a lifetimes service (even if not this one) is important!
    this.lifetimes = new LifetimesService(this, CONFIG);
  }

  // we still use an in-mem cache in the worker in order to ensure
  // the ability to use an indexeddb cache is opaque to your format.
  // we cache by resource and document, its up to the cache to ensure
  // it can give us this information when desired.
  //
  // however!
  // we do not need to implement the instantiateRecord/teardownRecord
  // hooks for in the worker.
  createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }
}

export default DataWorke.create(Store);
