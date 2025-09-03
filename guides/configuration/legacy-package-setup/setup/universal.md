---
order: 0
outline:
  level: 2,3
---

::: tip Boilerplate Sucks 👎🏽
We're re-aligning our packages into a new streamlined installation and setup experience.<br>
Below you'll find the current *boilerplate heavy* setup.

Curious? Read the [RFC](https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/)
:::

# Setup

All frameworks should follow this configuration first.

## Configure the Build Plugin

***Warp*Drive** uses a [babel plugin](https://www.npmjs.com/package/@embroider/macros) to inject app-specific configuration allowing us to provide advanced dev-mode debugging features, deprecation management, and canary feature toggles.

For Ember.js, this plugin comes built-in to the toolchain and all you need to do is provide it
the desired configuration in `ember-cli-build`. For all other projects, the configuration
is done inside of the app's babel configuration file.

::: code-group

```ts [New Ember Apps]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:7]
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    // for new apps it should be the version you installed
    compatWith: '5.5'
  });

  return compatBuild(app, buildOnce);
};
```

```ts [Existing Ember Apps]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:9]
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    compatWith: '4.12'
    deprecations: {
      // ... list individual deprecations that have been resolved here
    }
  });

  return compatBuild(app, buildOnce);
};
```

:::

## Add TypeScript Types

::: code-group

```tsconfig.json [Ember Polaris]
{
  compilerOptions: {
    types: [
      "@ember-data/debug/unstable-preview-types", // [!code ++]
      "@ember-data/graph/unstable-preview-types", // [!code ++]
      "@ember-data/json-api/unstable-preview-types", // [!code ++]
      "@ember-data/request/unstable-preview-types", // [!code ++]
      "@ember-data/request-utils/unstable-preview-types", // [!code ++]
      "@ember-data/store/unstable-preview-types", // [!code ++]
      "@warp-drive/build-config/declarations", // [!code ++]
      "@warp-drive/core-types/unstable-preview-types", // [!code ++]
      "@warp-drive/schema-record/unstable-preview-types", // [!code ++]
    ]
  }
}
```

```tsconfig.json [Ember Full Legacy]
{
  compilerOptions: {
    types: [
      "@ember-data/adapter/unstable-preview-types", // [!code ++]
      "@ember-data/debug/unstable-preview-types", // [!code ++]
      "@ember-data/graph/unstable-preview-types", // [!code ++]
      "@ember-data/json-api/unstable-preview-types", // [!code ++]
      "@ember-data/legacy-compat/unstable-preview-types", // [!code ++]
      "@ember-data/model/unstable-preview-types", // [!code ++]
      "@ember-data/request/unstable-preview-types", // [!code ++]
      "@ember-data/request-utils/unstable-preview-types", // [!code ++]
      "@ember-data/serializer/unstable-preview-types", // [!code ++]
      "@ember-data/store/unstable-preview-types", // [!code ++]
      "@warp-drive/build-config/declarations", // [!code ++]
      "@warp-drive/core-types/unstable-preview-types", // [!code ++]
      "@warp-drive/schema-record/unstable-preview-types", // [!code ++]
    ]
  }
}
```


## Configure the Store

To get up and running we need to configure a `Store` to understand how we want
to handle requests, what our data looks like, how to cache it, and what sort of
reactive objects to create for that data.

Here's an example final configuration. Below we'll show each bit in parts and
discuss what each does.

::: tip 💡 Guide
Looking for Legacy Adapter/Serializer Support?

→ After finishing this page read the guide for [Ember.js](./2-ember.md)
:::

::: code-group

```ts [ReactiveResource]
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CachePolicy } from '@ember-data/request-utils';

import JSONAPICache from '@ember-data/json-api';

import type { ResourceKey } from '@warp-drive/core-types';
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

```ts [Model (Ember Only)]
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

```ts [Migration (Ember Only)]
import Store, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CachePolicy } from '@ember-data/request-utils';

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

### Start With A Store

The store is the central piece of the ***Warp*Drive** experience. It functions as a coordinator,
linking together requests for data with schemas, caching and reactivity.

While it's easy to use ***just*** ***Warp*Drive**'s request management, most apps will find they
require far more than basic fetch management. For this reason it's often best to start with a Store even when you aren't sure yet.

```ts
import Store from '@ember-data/store';

export default class AppStore extends Store {}
```

### Add Basic Request Management

`RequestManager` provides a chain-of-responsibility style pipeline for helping
you handle centralized concerns around requesting and updating data from your
backend.

::: tip 💡 Guide
→ Learn more about [Making Requests](../../2-requests.md)
:::

```ts
import Store from '@ember-data/store';

import RequestManager from '@ember-data/request'; // [!code focus:2]
import Fetch from '@ember-data/request/fetch';

export default class AppStore extends Store {
  requestManager = new RequestManager() // [!code focus:2]
    .use([Fetch]);
}
```

### Add a Source for Schema for your Data

***Warp*Drive** uses simple JSON schemas to define the shape
and features of reactive objects. Schemas may seem simple, but
they come packed with features that will help you build incredible
applications.

::: tip 💡 Guide
→ Learn more about [Resource Schemas](../../8-schemas.md)
:::

::: code-group

```ts [ReactiveResource]
import Store from '@ember-data/store';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import {  // [!code focus:4]
  registerDerivations,
  SchemaService,
} from '@warp-drive/schema-record';

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

```ts [Model (Ember Only)]
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

```ts [Migration (Ember Only)]
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

### Add a Cache

Do you really need a cache? Are sunsets beautiful? Caching is what powers features like
immutability, mutation management, and allows ***Warp*Drive** to understand your relational
data.

Some caches are simple request/response maps. ***Warp*Drive**'s is not. The Cache deeply
understands the structure of your data, ensuring your data remains consistent both within
and across requests.

Out of the box, ***Warp*Drive** provides a Cache that expects the [{json:api}](https://jsonapi.org) format. This format excels at simiplifying common complex problems around cache consistency and information density. Most APIs can be quickly adapted to work with it, but if a cache built to understand another format would do better it just needs to follow the same interface.

```ts
import Store, { CacheHandler } from '@ember-data/store'; // [!code focus:2]
import type { CacheCapabilitiesManager } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import JSONAPICache from '@ember-data/json-api'; // [!code focus]

import {
  registerDerivations,
  SchemaService,
} from '@warp-drive/schema-record';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) { // [!code focus:2]
    return new JSONAPICache(capabilities);
  }
}
```

### Setup Your Data to be Reactive

While it is possible to use ***Warp*Drive** to store and retrieve raw json, you'd
be missing out on the best part. Reactive objects transform raw cached data into rich,
reactive data. The resulting objects are immutable, always displaying the latest state
in the cache while preventing accidental or unsafe mutation in your app.

::: code-group

```ts [ReactiveResource]
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import JSONAPICache from '@ember-data/json-api';

import type { ResourceKey } from '@warp-drive/core-types'; // [!code focus]
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

```ts [Model (Ember Only)]
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


```ts [Migration (Ember Only)]
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

### Decide How Long Requests are Valid for with a CachePolicy

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

```ts
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CachePolicy } from '@ember-data/request-utils'; // [!code focus]

import JSONAPICache from '@ember-data/json-api';

import type { ResourceKey } from '@warp-drive/core-types';
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

  lifetimes = new CachePolicy({ // [!code focus:9]
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

### Configure Your Framework

The final setup step is to configure reactivity for your framework. See
each framework's guide for this step.

- [Ember.js](./2-ember.md)

## Configure ESLint

🚧 Under Construction
