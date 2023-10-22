/**
 <p align="center">
  <img
    class="project-logo"
    src="https://raw.githubusercontent.com/emberjs/data/4612c9354e4c54d53327ec2cf21955075ce21294/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
</p>

<p align="center">The lightweight reactive data library for JavaScript applications</p>

---

Wrangle your application's data management with scalable patterns for developer productivity.

- ⚡️  Committed to Best-In-Class Performance
- 🌲 Focused on being as svelte as possible
- 🚀 SSR Ready
- 🔜 Typescript Support
- 🐹 Built with ♥️ by [Ember](https://emberjs.com)
- ⚛️ Supports any API: `GraphQL` `JSON:API` `REST` `tRPC` ...bespoke or a mix

### 📖 On This Page

- [Overview](./#overview)
  - [Architecture](#🪜-architecture)
  - [Basic Installation](#basic-installation)
  - [Advanced Installation](#advanced-installation)
- [Configuration](#configuration)
  - [Deprecation Stripping](#deprecation-stripping)
  - [randomUUID polyfill](#randomuuid-polyfill)
  - [Removing inspector support in production](#removing-inspector-support-in-production)
  - [Debugging](#debugging)


# Overview

*Ember*‍**Data** is a lightweight reactive data library for JavaScript applications that provides composable primitives for ordering query/mutation/peek flows, managing network and cache, and reducing data for presentation.

## 🪜 Architecture

The core of *Ember*‍**Data** is the `Store`, which coordinates interaction between your application, the `Cache`, and sources of data (such as your `API` or a local persistence layer).
Optionally, the Store can be configured to hydrate the response data into rich presentation classes.

*Ember*‍**Data** is both resource centric and document centric in it's approach to caching, requesting and presenting data. Your application's configuration and usage drives which is important and when.

The `Store` is a **coordinator**. When using a `Store` you configure what cache to use, how cache data should be presented to the UI, and where it should look for requested data when it is not available in the cache.

This coordination is handled opaquely to the nature of the requests issued and the format of the data being handled. This approach gives applications broad flexibility to configure *Ember*‍**Data** to best suite their needs. This makes *Ember*‍**Data** a powerful solution for applications regardless of their size and complexity.

*Ember*‍**Data** is designed to scale, with a religious focus on performance and asset-size to keep its footprint small but speedy while still being able to handle large complex APIs in huge data-driven applications with no additional code and no added application complexity. It's goal is to prevent applications from writing code to manage data that is difficult to maintain or reason about.

*Ember*‍**Data**'s power comes not from specific features, data formats, or adherence to specific API specs such as `JSON:API` `trpc` or `GraphQL`, but from solid conventions around requesting and mutating data developed over decades of experience scaling developer productivity.

## Basic Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add ember-data
```

`ember-data` is installed by default for new applications generated with `ember-cli`. You can check what version is installed by looking in the `devDependencies` hash of your project's [package.json](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) file.

If you have generated a new `Ember` application using `ember-cli` but do
not wish to use `ember-data`, remove `ember-data` from your project's `package.json` file and run your package manager's install command to update your lockfile.

## Advanced Installation

*Ember*‍**Data** is organized into primitives that compose together via public APIs.

- [@ember-data/store](/ember-data/release/modules/@ember-data%2Fstore) is the core and handles coordination
- [@ember-data/json-api](/ember-data/release/modules/@ember-data%2Fjson-api) provides a resource cache for JSON:API structured data. It integrates with the store via the hook `createCache`
- [@ember-data/model](/ember-data/release/modules/@ember-data%2Fmodel) is a presentation layer, it integrates with the store via the hooks `instantiateRecord` and `teardownRecord`.
- [@ember-data/adapter](/ember-data/release/modules/@ember-data%2Fadapter) provides various network API integrations for APIS built over specific REST or JSON:API conventions.
- [@ember-data/serializer](/ember-data/release/modules/@ember-data%2Fserializer) pairs with `@ember-data/adapter` to normalize and serialize data to and from an API format into the `JSON:API` format understood by `@ember-data/json-api`.
- [@ember-data/debug](/ember-data/release/modules/@ember-data%2Fdebug) provides debugging support for the `ember-inspector`.
- **ember-data** is a "meta" package which bundles all of these together for convenience

The packages interop with each other through well defined public API boundaries. The core
of the library is the store provided by `@ember-data/store`, while each of the other libraries plugs into the store when installed. Because these packages interop via fully
public APIs, other libraries or applications may provide their own implementations. For instance, [ember-m3](https://github.com/hjdivad/ember-m3) is a commonly used presentation and cache implementation suitable for complex resource objects and graphs.

## Configuration

### Deprecation Stripping

*Ember*‍**Data** allows users to opt-in and remove code that exists to support deprecated behaviors.

If your app has resolved all deprecations present in a given version, you may specify that version as your "compatibility" version to remove the code that supported the deprecated behavior from your app.

```ts
let app = new EmberApp(defaults, {
  emberData: {
    compatWith: '4.8',
  },
});
```

- [Full Documentation](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fdeprecations)

### randomUUID polyfill

*Ember*‍**Data** uses `UUID V4` by default to generate identifiers for new data created on the client. Identifier generation is configurable, but we also for convenience will polyfill
the necessary feature if your browser support or deployment environment demands it. To
activate this polyfill:

```ts
let app = new EmberApp(defaults, {
  '@embroider/macros': {
    setConfig: {
      '@ember-data/store': {
        polyfillUUID: true
      },
    },
  },
});
```

### removing inspector support in production

If you do not with to ship inspector support in your production application, you can specify
that all support for it should be stripped from the build.

```ts
let app = new EmberApp(defaults, {
  emberData: {
    includeDataAdapterInProduction: false
  }
});
```

- [Full Documentation](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fdebug)

### Debugging

Many portions of the internals are helpfully instrumented with logging that can be activated
at build time. This instrumentation is always removed from production builds or any builds
that has not explicitly activated it. To activate it set the appropriate flag to `true`.

```ts
  let app = new EmberApp(defaults, {
    emberData: {
      debug: {
          LOG_PAYLOADS: false, // data store received to update cache with
          LOG_OPERATIONS: false, // updates to cache remote state
          LOG_MUTATIONS: false, // updates to cache local state
          LOG_NOTIFICATIONS: false,
          LOG_REQUESTS: false, // log Requests issued via the request manager
          LOG_REQUEST_STATUS: false,
          LOG_IDENTIFIERS: false,
          LOG_GRAPH: false,
          LOG_INSTANCE_CACHE: false,
      }
    }
  });
  ```

 @module ember-data-overview
 @main ember-data-overview
*/
import 'ember-inflector';

import { deprecate } from '@ember/debug';

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

import Adapter, { BuildURLMixin } from '@ember-data/adapter';
import AdapterError, {
  AbortError,
  ConflictError,
  ForbiddenError,
  InvalidError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
} from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Serializer from '@ember-data/serializer';
import { BooleanTransform, DateTransform, NumberTransform, StringTransform } from '@ember-data/serializer/-private';
import JSONSerializer from '@ember-data/serializer/json';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import Transform from '@ember-data/serializer/transform';

import {
  DS,
  Errors,
  ManyArray,
  PromiseArray,
  PromiseManyArray,
  PromiseObject,
  RecordArrayManager,
  Snapshot,
  Store,
} from './-private';
import setupContainer from './setup-container';

deprecate(
  'Importing from `ember-data` is deprecated. Please import from the appropriate `@ember-data/*` instead.',
  false,
  {
    id: 'ember-data:deprecate-legacy-imports',
    for: 'ember-data',
    until: '6.0',
    since: {
      enabled: '5.2',
      available: '5.2',
    },
  }
);

interface DSLibrary extends DS {
  Store: typeof Store;
  PromiseArray: typeof PromiseArray;
  PromiseObject: typeof PromiseObject;
  PromiseManyArray: typeof PromiseManyArray;
  Model: typeof Model;
  attr: typeof attr;
  Errors: typeof Errors;
  Snapshot: typeof Snapshot;
  Adapter: typeof Adapter;
  AdapterError: typeof AdapterError;
  InvalidError: typeof InvalidError;
  TimeoutError: typeof TimeoutError;
  AbortError: typeof AbortError;
  UnauthorizedError: typeof UnauthorizedError;
  ForbiddenError: typeof ForbiddenError;
  NotFoundError: typeof NotFoundError;
  ConflictError: typeof ConflictError;
  ServerError: typeof ServerError;
  Serializer: typeof Serializer;
  // @ts-expect-error untyped
  DebugAdapter?: typeof import('@ember-data/debug').default;
  ManyArray: typeof ManyArray;
  RecordArrayManager: typeof RecordArrayManager;
  RESTAdapter: typeof RESTAdapter;
  BuildURLMixin: typeof BuildURLMixin;
  RESTSerializer: typeof RESTSerializer;
  JSONSerializer: typeof JSONSerializer;
  JSONAPIAdapter: typeof JSONAPIAdapter;
  JSONAPISerializer: typeof JSONAPISerializer;
  Transform: typeof Transform;
  DateTransform: typeof DateTransform;
  StringTransform: typeof StringTransform;
  NumberTransform: typeof NumberTransform;
  BooleanTransform: typeof BooleanTransform;
  EmbeddedRecordsMixin: typeof EmbeddedRecordsMixin;
  belongsTo: typeof belongsTo;
  hasMany: typeof hasMany;
  _setupContainer: typeof setupContainer;
}

function upgradeDS(obj: unknown): asserts obj is DSLibrary {}

upgradeDS(DS);

DS.Store = Store;
DS.PromiseArray = PromiseArray;
DS.PromiseObject = PromiseObject;
DS.PromiseManyArray = PromiseManyArray;
DS.Model = Model;
DS.attr = attr;
DS.Errors = Errors;
DS.Snapshot = Snapshot;
DS.Adapter = Adapter;
DS.AdapterError = AdapterError;
DS.InvalidError = InvalidError;
DS.TimeoutError = TimeoutError;
DS.AbortError = AbortError;
DS.UnauthorizedError = UnauthorizedError;
DS.ForbiddenError = ForbiddenError;
DS.NotFoundError = NotFoundError;
DS.ConflictError = ConflictError;
DS.ServerError = ServerError;
DS.Serializer = Serializer;

if (macroCondition(dependencySatisfies('@ember-data/debug', '*'))) {
  // @ts-expect-error untyped
  DS.DebugAdapter = (importSync('@ember-data/debug') as typeof import('@ember-data/debug')).default;
}

DS.ManyArray = ManyArray;
DS.RecordArrayManager = RecordArrayManager;
DS.RESTAdapter = RESTAdapter;
DS.BuildURLMixin = BuildURLMixin;
DS.RESTSerializer = RESTSerializer;
DS.JSONSerializer = JSONSerializer;
DS.JSONAPIAdapter = JSONAPIAdapter;
DS.JSONAPISerializer = JSONAPISerializer;
DS.Transform = Transform;
DS.DateTransform = DateTransform;
DS.StringTransform = StringTransform;
DS.NumberTransform = NumberTransform;
DS.BooleanTransform = BooleanTransform;
DS.EmbeddedRecordsMixin = EmbeddedRecordsMixin;
DS.belongsTo = belongsTo;
DS.hasMany = hasMany;
DS._setupContainer = setupContainer;

export default DS;
