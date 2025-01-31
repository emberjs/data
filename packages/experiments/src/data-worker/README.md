<p align="center">
  <img
    class="project-logo"
    src="../../NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="../../NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">DataWorker</h3>

- 🏡 Basic LocalFirst features
- 🔋 Run Fetch/PersistedCache logic in a Worker
- ♻️ Dedupe Requests across Tabs and Windows

## Install

```cli
pnpm add @warp-drive/experiments
```

Or use your favorite javascript package manager.

## About

DataWorker enables offloading network related work to a SharedWorker.

In addition to freeing up a bit of CPU time on the main thread, this enables
intelligent deduping of requests made by your application across multiple
tabs and windows keeping overall network resource usage on the device lower.

## Known Limitations

Permanent (we do not plan to address these limitations)
- Your ember application must be built with embroider
- DataWorker is only available for applications that have removed their usage
of Adapters and Serializers.
- Service injection is not available inside the worker, any services you were injecting
  into the store or into handlers need to be provided as standalone instances.
  You can use the constructor or class fields to assign these.
- You must resolve the deprecation of store extending EmberObject

```ts
  setConfig(app, __dirname, {
    deprecations: {
      DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: false,
    },
  });
```

Temporary (we plan to address these limitations)
- Requests fulfilled by the DataWorker do not (yet) support streaming responses into the client
- (intentionally) not active in SSR/Fastboot Environments
- dirty state is never sent to the worker, and thus does not sync cross-tab/restore on refresh
- because dirty state is never sent to the worker, in-flight states do not exist either, which
  means that save operations which persist local changes will not work as expected if the API
  request does not also return the new state.
- Errors are not restored into their proper shape and form yet

## Configure

Configuring your app to use a DataWorker happens in two steps:

1. Creating and configuring the Worker instance
2. Updating your App's store to use the Worker

> [!TIP]
> The DataWorker works best with PersistedCache but can be used without it.

### Step 1. Create The Worker

A DataWorker is a Store instance that runs in a Worker wrapped in a lightweight
shell to handle communication with your application.

The store should have nearly the same configuration as the store used by your app,
with a few exceptions:

- Instead of using the `CacheHandler` from `@ember-data/store` we use the one provided by
  `@warp-drive/experiments/data-worker`
- Since this store will never directly instantiate records, you should omit the configuration
  of the `instantiateRecord` and `teardownRecord` hooks.

Below is an example worker using a `JSONAPI` cache and the basic `Fetch` handler.

```ts
import Store from '@ember-data/store';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import JSONAPICache from '@ember-data/json-api';

import { DataWorker, CacheHandler } from '@warp-drive/experiments/data-worker';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { CachePolicy } from '@ember-data/request-utils';
import { SchemaService } from '@warp-drive/schema-record/schema';

class WorkerStore extends Store {
  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  lifetimes = new CachePolicy({
    apiCacheHardExpires: 600_000,
    apiCacheSoftExpires: 300_000,
  });

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  createSchemaService() {
    return new SchemaService();
  }
}

new DataWorker(WorkerStore);
```

### Step 2. Modify Your Application

In the configuration for your application's `RequestManager`, drop all handlers
and replace them with `WorkerFetch`.

```ts
import { WorkerFetch } from '@warp-drive/experiments/worker-fetch';

// this approach to constructing the worker instance will work with both embroider/webpack
// and embroider/vite
const worker = new SharedWorker(new URL('./basic-worker.ts', import.meta.url));

manager.use([new WorkerFetch(worker)]);
```

> [!TIP]
> SharedWorker and Worker are both supported; however, SharedWorker is preferred. 
> Worker is sometimes the better choice for test environments.

### Step 3. Configure Persistence

Pass `{ persisted: true }` to the DataWorker as the second arg e.g.

```ts
new DataWorker(WorkerStore, { persisted: true });
```

When persistence it activated, if a given request does not have an in-memory cache entry
the cache handler will first attempt to load a persisted response into the in-memory cache
before continuing with its checks on staleness etc.

#### Scopes

- setting the scope
- clearing a scope
- changing a scope

#### Usage in SSR

In SSR, WorkerFetch will deactivate itself and pass through all requests on the handler chain.
This means that to support fetch in SSR all you need to do is keep your original handler chain
present in your configuration.

For example:

```ts
manager.use([new WorkerFetch(worker), MyHandler, Fetch]);
```

Likely you want to prevent creating the worker in SSR. When in SSR mode, the worker argument
is allowed to be `null` to support guarding its creation.

```ts
const worker = isFastBoot ? null : new SharedWorker(new URL('./basic-worker.ts', import.meta.url));

manager.use([new WorkerFetch(worker), MyHandler, Fetch]);
```

#### Usage in Tests

In tests, its often best to use a `Worker` or the main thread instead of a `SharedWorker`.

Main Thread Example:

```ts
const worker = macroCondition(isTesting()) ? null : new SharedWorker(new URL('./basic-worker.ts', import.meta.url));
const handlers = worker ? [new WorkerFetch(worker)] : [MyHandler, Fetch];

manager.use(handlers);
```

Worker Constructor Example:

```ts
const worker = macroCondition(isTesting()) ? new Worker(new URL('./basic-worker.ts', import.meta.url)) : new SharedWorker(new URL('./basic-worker.ts', import.meta.url));

manager.use([new WorkerFetch(worker)]);
```
