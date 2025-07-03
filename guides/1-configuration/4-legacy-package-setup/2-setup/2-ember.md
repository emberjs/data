# Ember.js

## Configure Reactivity

1. Ensure `@warp-drive/ember` is [installed](../1-overview.md#installation) with the proper version
2. In the main entry point for your app add the following side-effect import

```ts [app/app.ts]
import '@warp-drive/ember/install';
```

3. If you have tests, such as unit tests, which make use of WarpDrive directly and not via an app container
   you may also need to add the side-effect import to `tests/test-helper.{js,ts}`

4. If it is installed, remove the package `@ember-data/tracking`.
5. Change any usage of `untracked`

```ts
import { untracked } from '@ember-data/tracking'; // [!code --]
import { untrack as untracked } from '@glimmer/validator'; // [!code ++]
```

::: tip 💡 @glimmer/validator is a virtual dep
You do not need to add a dependency on `@glimmer/validator`, this is a virtual package provided by `ember-source`.
:::

6. Remove the deprecation for use of @ember-data/tracking by setting the deprecation to `false` in your build config:

```ts [ember-cli-build.js]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config');
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, {
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    compatWith: '4.12'
    deprecations: { // [!code focus:3]
      DEPRECATE_TRACKING_PACKAGE: false 
    }
  });

  return compatBuild(app, buildOnce);
};
```

## Setup Legacy Support

This guide presumes you've already gone through the [setup steps 
that apply to all applications](./1-universal.md)

"Legacy" is a term that applies to a fairly broad set of patterns that
***Warp*Drive**/***Ember*Data** is migrating away from. The previous
guide showed how to configure schemas and reactivity to work with the
legacy `Model` approach. You may also wish to configure legacy support
for `Adapters` and `Serializers`.

Reasons to configure this legacy support include:

- You have an existing application that has not migrated all requests away from this pattern
- You are creating a new application and [LinksMode](../../misc/links-mode.md) is not sufficient

1. Ensure `@ember-data/legacy-compat` is [installed](../1-overview.md#installation) with the proper version
2. Add desired hooks to the store. The below example builds from the `Model` example in the prior guide.

```ts [app/services/store.ts]
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
import { // [!code focus:9]
  adapterFor,
  cleanup,
  LegacyNetworkHandler,
  normalize,
  pushPayload,
  serializeRecord,
  serializerFor,
} from '@ember-data/legacy-compat';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([LegacyNetworkHandler, Fetch]) // [!code focus]
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

  instantiateRecord(identifier: ResourceKey, createRecordArgs: Record<string, unknown>) {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord.call(this, record as Model);
  }

  modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  modelFor(type: string): ModelSchema;
  modelFor(type: string): ModelSchema {
    return (modelFor.call(this, type) as ModelSchema) || super.modelFor(type);
  }

  adapterFor = adapterFor; // [!code focus:5]
  serializerFor = serializerFor;
  pushPayload = pushPayload;
  normalize = normalize;
  serializeRecord = serializeRecord;

  destroy() {  // [!code focus:4]
    cleanup.call(this);
    super.destroy();
  }
}
```
