/**
 # Overview

`EmberData` is a lightweight reactive data library for javascript applications that provides composable primitives for ordering query/mutation/peek flows, managing network and cache, and reducing data for presentation that you can plug-and-play as desired for any api  structure and format.

It was designed for robustly managing data in applications built with [Ember](https://github.com/emberjs/ember.js/) and is agnostic to the underlying persistence mechanism, so it works just as well with [JSON:API](https://jsonapi.org/) or [GraphQL](https://graphql.org/) over `HTTPS` as it does with streaming `WebSockets` or local `IndexedDB` storage.

It provides many of the facilities you'd find in server-side `ORM`s like `ActiveRecord`, but is designed specifically for the unique environment of `JavaScript` in the browser.

EmberData is organized into primitives that compose together via public APIs.

- [@ember-data/store](/ember-data/release/modules/@ember-data%2Fstore is the core and handles coordination
- [@ember-data/record-data](/ember-data/release/modules/@ember-data%2Frecord-data) is a resource cache for JSON:API structured data. It integrates with the store via the hook `createRecordDataFor`
- [@ember-data/model](/ember-data/release/modules/@ember-data%2Fmodel) is a presentation layer, it integrates with the store via the hooks `instantiateRecord` and `teardownRecord`.
- [@ember-data/adapter](/ember-data/release/modules/@ember-data%2Fadapter) provides various network API integrations for APIS built over specific REST or JSON:API conventions.
- [@ember-data/serializer](/ember-data/release/modules/@ember-data%2Fserializer) pairs with `@ember-data/adapter` to normalize and serialize data to and from an API format into the `JSON:API` format understood by `@ember-data/record-data`.
- [@ember-data/debug](/ember-data/release/modules/@ember-data%2Fdebug) provides debugging support for the `ember-inspector`.
- **ember-data** is a "meta" package which bundles all of these together for convenience

The packages interop with each other through well defined public API boundaries. The core
of the library is the store provided by `@ember-data/store`, while each of the other libraries plugs into the store when installed. Because these packages interop via fully
public APIs, other libraries or applications may provide their own implementations. For instance, [ember-m3](https://github.com/hjdivad/ember-m3) is a commonly used presentation and cache implementation suitable for complex resource objects and graphs.

## Configuration

### Deprecation Stripping

EmberData allows users to opt-in and remove code that exists to support deprecated behaviors.

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

EmberData uses `UUID V4` by default to generate identifiers for new data created on the client. Identifier generation is configurable, but we also for convenience will polyfill
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
          LOG_NOTIFICATIONS: false,
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

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

import Adapter, { BuildURLMixin } from '@ember-data/adapter';
import AdapterError, {
  AbortError,
  ConflictError,
  errorsArrayToHash,
  errorsHashToArray,
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
import Store, { normalizeModelName } from '@ember-data/store';

import {
  DS,
  Errors,
  ManyArray,
  PromiseArray,
  PromiseManyArray,
  PromiseObject,
  RecordArrayManager,
  Snapshot,
} from './-private';
import setupContainer from './setup-container';

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

DS.errorsHashToArray = errorsHashToArray;
DS.errorsArrayToHash = errorsArrayToHash;

DS.Serializer = Serializer;

if (macroCondition(dependencySatisfies('@ember-data/debug', '*'))) {
  DS.DebugAdapter = importSync('@ember-data/debug').default;
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

Object.defineProperty(DS, 'normalizeModelName', {
  enumerable: true,
  writable: false,
  configurable: false,
  value: normalizeModelName,
});

export default DS;
