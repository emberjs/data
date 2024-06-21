<p align="center">
  <img
    class="project-logo"
    src="./NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="./NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">Experiments that may or may not make it into the project core</h3>
<p align="center">Ideal for Having Fun</p>
<p align="center">SharedWorker + IndexedDB robust request deduplication and replay</p>

> ⚠️ ***Experimental*** ⚠️

- :electron: Dedupe requests across multiple tabs and windows
- ♻️ Replay requests reliably in any order and still get the latest state of all associated resources
- 📶 Load new tabs or windows without ever hitting network
- 💪 Control the Cache lifetime with confidence


## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @warp-driveexperiments
```

## 🚀 Setup

Using the Data Worker requires a small bit of configuration

1. [Configuring the Worker]()
2. [Configuring the Worker Build]()
3. [Configuring your App]()

### 1. Configuring the Worker

In `<project>/workers/ember-data-cache-worker.js`

```ts
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CachePolicy } from '@ember-data/request-utils';
import { DataWorker, CacheHandler } from '@warp-drive/experiments';
import DataStore from '@ember-data/store';

const CONFIG = {
  apiCacheHardExpires: 120_000, // 2 minutes
  apiCacheSoftExpires: 30_000, // 30 seconds
};

class Store extends DataStore {
  constructor(args) {
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
    this.lifetimes = new CachePolicy(CONFIG);
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

export default DataWorker.create(Store);
```

### 2. Configuring the Worker Build

Coming Soon
### 3. Configuring Your App

In `app/services/store.ts`

```ts
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CachePolicy } from '@ember-data/request-utils';
import DataStore, { CacheHandler } from '@ember-data/store';
import { WorkerFetch } from 'warp-drive/experiments';

const CONFIG = {
  apiCacheHardExpires: 120_000, // 2 minutes
  apiCacheSoftExpires: 30_000, // 30 seconds
};

export default class Store extends DataStore {
  constructor(args) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    const workerUrl = new URL('./ember-data-cache-worker.js', import.meta.url)
    const workerFetch = new WorkerFetch(this, workerUrl);

    manager.use([workerFetch, Fetch]);
    manager.useCache(CacheHandler);

    // our indexeddb cache will respect lifetimes, so registering
    // a lifetimes service (even if not this one) is important!
    this.lifetimes = new CachePolicy(CONFIG);
  }
}
```
