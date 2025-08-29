---
order: 1
title: Additional Setup for Ember
---

:::warning caution
Older legacy features of WarpDrive (inherited from when the library was named EmberData) should only be used with Ember.
:::

# Additional Setup for Ember

## Configuring TypeScript

TypeScript will automatically discover the types these packages provide. If you're using `ember-source`, you should also configure and use Ember's native types. If you
previously had any [DefinitelyTyped (@types)](https://github.com/DefinitelyTyped/DefinitelyTyped) packages installed for ember or ember-data you should remove those.

If you have any references to ember-data or warp-drive types or types packages in package.json or tsconfig.json you can remove those.

## What is "Legacy"

You've probably heard old code patterns referred to as "legacy code" before. In WarpDrive, Legacy refers to older features which we are giving a second, extended life. When features are deprecated in `@warp-drive/core`, they are added to @warp-drive/legacy` in a way that allows apps to opt-in to bring them back.

Legacy features will not live forever, but they will receive a second deprecation cycle before being deleted. There is no set schedule to when code in legacy might
be deprecated. Sometimes it may become deprecated immediately after the feature is
removed from core, other times it may last for several majors. It all depends on how easy the feature is to maintain support for weighed against the community and maintenance costs of keeping it around.

For example, if Ember were to deprecated EmberObject, then maintaining support for
Model, Adapter and Serializer would become untenable quickly - so we would opt to
simultaneously deprecate these from legacy.

The `@warp-drive/legacy` package is opt-in. New apps should not use it, existing apps
should work to remove the features it provides. Consider it your cleanup checklist.

## Configuring Legacy Support

The previous [setup guide](./index.md) showed how to configure schemas and reactivity to work with the legacy `Model` approach. You may also wish to configure legacy support for `Adapters` and `Serializers`.

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
