---
order: 1
title: Setup - Advanced
---


# Advanced Store Configuration

***Warp*Drive** is designed as a series of small packages and primitives with
clear interface-driven boundaries between each other and brought together by
configuration.

The `Store` is the central piece of the ***Warp*Drive** experience, linking
together how we handle requests, the schemas for what our data looks like,
how to cache it, and what sort of reactive objects to create for that data.

Here's an example final configuration. Below we'll show each bit in parts and
discuss what each does.

::: tip 💡 TIP
In frameworks that do DI via contexts, you will want to provide
the store via context near the application root.

In frameworks like [emberjs](https://emberjs.com) which use a
service injection pattern you will want to place the store file
in the appropriate location such as `<app>/services/store.ts`

In other frameworks you will want to create a singleton
store in module state that you will import and use when needed.
:::

:::tabs key:config

== Universal

```ts [services/store.ts]
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import {
  instantiateRecord,
  registerDerivations,
  SchemaService,
  teardownRecord
} from '@warp-drive/core/reactive';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import { JSONAPICache } from '@warp-drive/json-api';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  lifetimes = new DefaultCachePolicy({
    apiCacheHardExpires: 15 * 60 * 1000, // 15 minutes
    apiCacheSoftExpires: 1 * 30 * 1000, // 30 seconds
    constraints: {
    headers: {
        'X-WarpDrive-Expires': true,
        'Cache-Control': true,
        'Expires': true,
    }
    }
  });

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, key, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
```

== Model (Ember Only)

```ts [services/store.ts]
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema, SchemaService } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CachePolicy } from '@ember-data/request-utils';

import JSONAPICache from '@ember-data/json-api';

import type { ResourceKey } from '@warp-drive/core-types';
import type { TypeFromInstance } from '@warp-drive/core-types/record';

import type Model from '@ember-data/model';
import {
  buildSchema,
  instantiateRecord,
  modelFor,
  teardownRecord
} from '@ember-data/model';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  lifetimes = new CachePolicy({
    apiCacheHardExpires: 15 * 60 * 1000, // 15 minutes
    apiCacheSoftExpires: 1 * 30 * 1000, // 30 seconds
    constraints: {
      headers: {
        'X-WarpDrive-Expires': true,
        'Cache-Control': true,
        'Expires': true,
      }
    }
  });

  createSchemaService(): SchemaService {
    return buildSchema(this);
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createRecordArgs: Record<string, unknown>) {
    return instantiateRecord.call(this, key, createRecordArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord.call(this, record as Model);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
```

== Migration (Ember Only)

```ts [services/store.ts]
import Store, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { DefaultCachePolicy } from '@ember-data/request-utils';

import JSONAPICache from '@ember-data/json-api';

import type { ResourceKey } from '@warp-drive/core-types';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { DelegatingSchemaService } from '@ember-data/model/migration-support';

import type Model from '@ember-data/model';
import {
  instantiateRecord as instantiateModel,
  modelFor,
  teardownRecord as teardownModel
} from '@ember-data/model';
import {
  instantiateRecord,
  registerDerivations,
  SchemaService,
  teardownRecord
} from '@warp-drive/schema-record';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  lifetimes = new DefaultCachePolicy({
    apiCacheHardExpires: 15 * 60 * 1000, // 15 minutes
    apiCacheSoftExpires: 1 * 30 * 1000, // 30 seconds
    constraints: {
      headers: {
        'X-WarpDrive-Expires': true,
        'Cache-Control': true,
        'Expires': true,
      }
    }
  });

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return new DelegatingSchemaService(this, schema);
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) {
    if (this.schema.isDelegated(key)) {
      return instantiateModel.call(this, key, createRecordArgs)
    }
    return instantiateRecord(this, key, createArgs);
  }

  teardownRecord(record: unknown): void {
    const key = recordIdentifierFor(record);
    if (this.schema.isDelegated(key)) {
      return teardownModel.call(this, record as Model);
    }
    return teardownRecord(record);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
```

:::

## Start With A Store

The store is the central piece of the ***Warp*Drive** experience. It functions as a coordinator,
linking together requests for data with schemas, caching and reactivity.

While it's easy to use ***just*** ***Warp*Drive**'s request management, most apps will find they
require far more than basic fetch management. For this reason it's often best to start with a Store even when you aren't sure yet.

```ts [services/store.ts]
import { Store } from '@warp-drive/core';

export default class AppStore extends Store {}
```

## Add Basic Request Management

`RequestManager` provides a chain-of-responsibility style pipeline for helping
you handle centralized concerns around requesting and updating data from your
backend.

::: tip 💡 Guide
→ Learn more about [Making Requests](../the-manual/requests/index.md)
:::

```ts [services/store.ts]
import { Fetch, RequestManager, Store } from '@warp-drive/core'; // [!code focus]

export default class AppStore extends Store {
  requestManager = new RequestManager() // [!code focus:2]
    .use([Fetch]);
}
```

## Add a Source for Schema for your Data

***Warp*Drive** uses simple JSON schemas to define the shape
and features of reactive objects. Schemas may seem simple, but
they come packed with features that will help you build incredible
applications.

::: tip 💡 Guide
→ Learn more about [Resource Schemas](../the-manual/schemas/index.md)
:::

:::tabs key:config

== Universal

```ts [services/store.ts]
import { Fetch, RequestManager, Store } from '@warp-drive/core';
import {  // [!code focus:4]
  registerDerivations,
  SchemaService,
} from '@warp-drive/core/reactive';

export default class AppStore extends Store {
  requestManager = new RequestManager()
    .use([Fetch]);

  createSchemaService() { // [!code focus:5]
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

}
```

== Model (Ember Only)

```ts [services/store.ts]
import Store from '@ember-data/store';
import type { ModelSchema, SchemaService } from '@ember-data/store/types'; // [!code focus]

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import type { TypeFromInstance } from '@warp-drive/core-types/record'; // [!code focus]

import {  // [!code focus:4]
  buildSchema,
  modelFor,
} from '@warp-drive/schema-record';

export default class AppStore extends Store {
  requestManager = new RequestManager()
    .use([Fetch]);

  createSchemaService(): SchemaService { // [!code focus:3]
    return buildSchema(this);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>; // [!code focus:6]
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
```

== Migration (Ember Only)

```ts [services/store.ts]
import Store from '@ember-data/store';
import type { ModelSchema } from '@ember-data/store/types'; // [!code focus]

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import type { TypeFromInstance } from '@warp-drive/core-types/record'; // [!code focus:2]
import { DelegatingSchemaService } from '@ember-data/model/migration-support';

import {  // [!code focus:3]
  modelFor,
} from '@warp-drive/schema-record';
import { // [!code focus:4]
  registerDerivations,
  SchemaService,
} from '@warp-drive/schema-record';

export default class AppStore extends Store {
  requestManager = new RequestManager()
    .use([Fetch]);

  createSchemaService() { // [!code focus:5]
    const schema = new SchemaService();
    registerDerivations(schema);
    return new DelegatingSchemaService(this, schema);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>; // [!code focus:6]
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
```

:::

## Add a Cache

Do you really need a cache? Are sunsets beautiful? Caching is what powers features like
immutability, mutation management, and allows ***Warp*Drive** to understand your relational
data.

Some caches are simple request/response maps. ***Warp*Drive**'s is not. The Cache deeply
understands the structure of your data, ensuring your data remains consistent both within
and across requests.

Out of the box, ***Warp*Drive** provides a Cache that expects the [{json:api}](https://jsonapi.org) format. This format excels at simiplifying common complex problems around cache consistency and information density. Most APIs can be quickly adapted to work with it, but if a cache built to understand another format would do better it just needs to follow the same interface.

```ts [services/store.ts]
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core'; // [!code focus:1]
import {
  registerDerivations,
  SchemaService,
} from '@warp-drive/core/reactive';
import type {  // [!code focus:4]
  CacheCapabilitiesManager
} from '@warp-drive/core/types';
import { JSONAPICache } from '@warp-drive/json-api';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler); // [!code focus:1]

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) { // [!code focus:3]
    return new JSONAPICache(capabilities);
  }
}
```

## Setup Your Data to be Reactive

While it is possible to use ***Warp*Drive** to store and retrieve raw json, you'd
be missing out on the best part. Reactive objects transform raw cached data into rich,
reactive data. The resulting objects are immutable, always displaying the latest state
in the cache while preventing accidental or unsafe mutation in your app.

:::tabs key:config

== ReactiveResource

```ts [services/store.ts]
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import type {
  CacheCapabilitiesManager,
  ResourceKey // [!code focus]
} from '@warp-drive/core/types';
import {
  instantiateRecord, // [!code focus]
  registerDerivations,
  SchemaService,
  teardownRecord // [!code focus]
} from '@warp-drive/core/reactive';
import { JSONAPICache } from '@warp-drive/json-api';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) { // [!code focus:3]
    return instantiateRecord(this, key, createArgs);
  }

  teardownRecord(record: unknown): void { // [!code focus:3]
    return teardownRecord(record);
  }
}
```

== Model (Ember Only)

```ts [services/store.ts]
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema, SchemaService } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import JSONAPICache from '@ember-data/json-api';

import type { ResourceKey } from '@warp-drive/core-types'; // [!code focus]
import type { TypeFromInstance } from '@warp-drive/core-types/record';

import type Model from '@ember-data/model'; // [!code focus]
import {
  buildSchema,
  instantiateRecord, // [!code focus]
  modelFor,
  teardownRecord  // [!code focus]
} from '@ember-data/model';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  createSchemaService(): SchemaService {
    return buildSchema(this);
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createRecordArgs: Record<string, unknown>) {  // [!code focus:3]
    return instantiateRecord.call(this, key, createRecordArgs);
  }

  teardownRecord(record: unknown): void {  // [!code focus:3]
    return teardownRecord.call(this, record as Model);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
```

== Migration (Ember Only)

```ts [services/store.ts]
import Store, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import JSONAPICache from '@ember-data/json-api';

import type { ResourceKey } from '@warp-drive/core-types'; // [!code focus]
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { DelegatingSchemaService } from '@ember-data/model/migration-support';

import type Model from '@ember-data/model'; // [!code focus]
import {
  instantiateRecord as instantiateModel, // [!code focus]
  modelFor,
  teardownRecord as teardownModel // [!code focus]
} from '@ember-data/model';
import {
  instantiateRecord, // [!code focus]
  registerDerivations,
  SchemaService,
  teardownRecord // [!code focus]
} from '@warp-drive/schema-record';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return new DelegatingSchemaService(this, schema);
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) {  // [!code focus:6]
    if (this.schema.isDelegated(key)) {
      return instantiateModel.call(this, key, createRecordArgs)
    }
    return instantiateRecord(this, key, createArgs);
  }

  teardownRecord(record: unknown): void {  // [!code focus:7]
    const key = recordIdentifierFor(record);
    if (this.schema.isDelegated(key)) {
      return teardownModel.call(this, record as Model);
    }
    return teardownRecord(record);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }
}
```

:::

## Decide How Long Requests are Valid for with a CachePolicy

And of course, what's a great cache without an eviction policy?

***Warp*Drive** provides an interface for creating Cache Policies. Whenever
a request is made, the policy is checked to determine if the current cached
representation is still valid.

Policies also have the ability to subscribe to cache updates and issue invalidation
notifications. The `<Request />` component subscribes to these notifications and will
trigger a reload if necessary if an invalidated request is in active use, letting you
craft advanced policies that meet your product's needs.

***Warp*Drive** provides a basic CachePolicy with a number of great defaults that
is a great starting point for most applications. We configure this basic policy
below.

The basic policy will invalidate requests based on caching and date headers available
on request responses, falling back to a simple time based policy.

```ts [services/store.ts]
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import {
  instantiateRecord,
  registerDerivations,
  SchemaService,
  teardownRecord
} from '@warp-drive/core/reactive';
import { DefaultCachePolicy } from '@warp-drive/core/store'; // [!code focus]
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import { JSONAPICache } from '@warp-drive/json-api';


export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  lifetimes = new DefaultCachePolicy({ // [!code focus:9]
    apiCacheHardExpires: 15 * 60 * 1000, // 15 minutes
    apiCacheSoftExpires: 1 * 30 * 1000, // 30 seconds
    constraints: {
      headers: {
        'X-WarpDrive-Expires': true,
        'Cache-Control': true,
        'Expires': true,
      }
    }
  });

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, key, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
```

