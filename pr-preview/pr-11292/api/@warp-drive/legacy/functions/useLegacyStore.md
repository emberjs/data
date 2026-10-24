---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/functions/useLegacyStore.md
---

&#x20;

# &#x20;useLegacyStore()

```ts
function useLegacyStore<T extends Cache>(options: LegacyModelStoreSetupOptions<T>, StoreKlass?: typeof Store$1): typeof ConfiguredStore;
function useLegacyStore<T extends Cache>(options: LegacyModelAndNetworkStoreSetupOptions<T>, StoreKlass?: typeof Store$1): typeof ConfiguredStore;
function useLegacyStore<T extends Cache>(options: LegacyModelAndNetworkAndRequestStoreSetupOptions<T>, StoreKlass?: typeof Store$1): typeof ConfiguredStore;
```

## Call Signature

```ts
function useLegacyStore<T extends Cache>(options: LegacyModelStoreSetupOptions<T>, StoreKlass?: typeof Store$1): typeof ConfiguredStore;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:285](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/index.ts#L285)

Use the legacy store with the given options.

See [LegacyStoreSetupOptions](../types/LegacyStoreSetupOptions.md) for details on the available options.

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  schemas: [],
});
```

### Adding Stateful Handlers

A request Handler is sometimes more than a plain object or class
with a `request` method — it may need access to a stateful dependency such
as an Ember service (an auth token, a feature-flags service, an i18n
helper, etc.).

A plain class handler that only relies on Ember's `@service` decorator will
not work here on its own: the handler is never instantiated *through*
Ember's container (it's just `new`'d up), so it has no owner and its
`@service` injections would fail to resolve.

Instead, give `handlers` a function. It receives the Store instance
being configured, which by the time the function runs already has an owner
assigned. Use `getOwner`/`setOwner` from `@ember/owner` to transfer that
owner onto your handler instance before returning it, exactly as you would
when constructing any other DI-aware object outside of the container:

```ts
import { getOwner, setOwner } from '@ember/owner';
import { service } from '@ember/service';
import { useLegacyStore } from '@warp-drive/legacy';
import type { NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { JSONAPICache } from '@warp-drive/json-api';

class AuthHandler {
  @service session;

  request<T>(context: RequestContext, next: NextFn<T>) {
    const headers = new Headers(context.request.headers);
    headers.append('Authorization', `Bearer ${this.session.accessToken}`);
    return next(Object.assign({}, context.request, { headers }));
  }
}

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  handlers: (store) => {
    const authHandler = new AuthHandler();
    setOwner(authHandler, getOwner(store)!);
    return [authHandler];
  },
});
```

The `handlers` function is invoked lazily and only once per store instance,
the first time `store.requestManager` is accessed, so it is safe to do
owner-dependent setup like this inside of it.

### Accessing the Store from a Handler's Context

If a handler only needs to read something *off of the store itself*
(its cache, or a property/service you've attached to a custom store
subclass) rather than an unrelated Ember service, there is a second,
simpler option that requires no DI/`setOwner` wiring at all.

Every request issued via Store.request | store.request(...)
automatically carries the originating store along as
RequestInfo.store | context.request.store. Any handler — a plain
object, a function-built handler, or a class — can read it directly,
without needing the `handlers` callback form shown above:

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import type { NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { JSONAPICache } from '@warp-drive/json-api';

const LoggingHandler = {
  request<T>(context: RequestContext, next: NextFn<T>) {
    // only present when the request was made via `store.request(...)`
    const store = context.request.store;
    if (store) {
      console.log(`[${store.constructor.name}] ${context.request.url ?? ''}`);
    }
    return next(context.request);
  },
};

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  handlers: [LoggingHandler],
});
```

The trade-off versus the `getOwner`/`setOwner` pattern above is that
`context.request.store` is only populated for requests issued via
`store.request(...)`; a request made directly against a
[RequestManager](../../core/classes/RequestManager.md) won't have it set unless the caller supplies it
explicitly, so a handler relying on it should treat it as optional (as
`LoggingHandler` does above).

### Type Parameters

#### T

`T` *extends* `Cache`

### Parameters

#### options

[`LegacyModelStoreSetupOptions`](../types/LegacyModelStoreSetupOptions.md)<`T`>

#### StoreKlass?

*typeof* `Store$1`

### Returns

*typeof* [`ConfiguredStore`](../classes/ConfiguredStore.md)

## Call Signature

```ts
function useLegacyStore<T extends Cache>(options: LegacyModelAndNetworkStoreSetupOptions<T>, StoreKlass?: typeof Store$1): typeof ConfiguredStore;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:289](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/index.ts#L289)

Use the legacy store with the given options.

See [LegacyStoreSetupOptions](../types/LegacyStoreSetupOptions.md) for details on the available options.

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  schemas: [],
});
```

### Adding Stateful Handlers

A request Handler is sometimes more than a plain object or class
with a `request` method — it may need access to a stateful dependency such
as an Ember service (an auth token, a feature-flags service, an i18n
helper, etc.).

A plain class handler that only relies on Ember's `@service` decorator will
not work here on its own: the handler is never instantiated *through*
Ember's container (it's just `new`'d up), so it has no owner and its
`@service` injections would fail to resolve.

Instead, give `handlers` a function. It receives the Store instance
being configured, which by the time the function runs already has an owner
assigned. Use `getOwner`/`setOwner` from `@ember/owner` to transfer that
owner onto your handler instance before returning it, exactly as you would
when constructing any other DI-aware object outside of the container:

```ts
import { getOwner, setOwner } from '@ember/owner';
import { service } from '@ember/service';
import { useLegacyStore } from '@warp-drive/legacy';
import type { NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { JSONAPICache } from '@warp-drive/json-api';

class AuthHandler {
  @service session;

  request<T>(context: RequestContext, next: NextFn<T>) {
    const headers = new Headers(context.request.headers);
    headers.append('Authorization', `Bearer ${this.session.accessToken}`);
    return next(Object.assign({}, context.request, { headers }));
  }
}

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  handlers: (store) => {
    const authHandler = new AuthHandler();
    setOwner(authHandler, getOwner(store)!);
    return [authHandler];
  },
});
```

The `handlers` function is invoked lazily and only once per store instance,
the first time `store.requestManager` is accessed, so it is safe to do
owner-dependent setup like this inside of it.

### Accessing the Store from a Handler's Context

If a handler only needs to read something *off of the store itself*
(its cache, or a property/service you've attached to a custom store
subclass) rather than an unrelated Ember service, there is a second,
simpler option that requires no DI/`setOwner` wiring at all.

Every request issued via Store.request | store.request(...)
automatically carries the originating store along as
RequestInfo.store | context.request.store. Any handler — a plain
object, a function-built handler, or a class — can read it directly,
without needing the `handlers` callback form shown above:

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import type { NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { JSONAPICache } from '@warp-drive/json-api';

const LoggingHandler = {
  request<T>(context: RequestContext, next: NextFn<T>) {
    // only present when the request was made via `store.request(...)`
    const store = context.request.store;
    if (store) {
      console.log(`[${store.constructor.name}] ${context.request.url ?? ''}`);
    }
    return next(context.request);
  },
};

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  handlers: [LoggingHandler],
});
```

The trade-off versus the `getOwner`/`setOwner` pattern above is that
`context.request.store` is only populated for requests issued via
`store.request(...)`; a request made directly against a
[RequestManager](../../core/classes/RequestManager.md) won't have it set unless the caller supplies it
explicitly, so a handler relying on it should treat it as optional (as
`LoggingHandler` does above).

### Type Parameters

#### T

`T` *extends* `Cache`

### Parameters

#### options

[`LegacyModelAndNetworkStoreSetupOptions`](../types/LegacyModelAndNetworkStoreSetupOptions.md)<`T`>

#### StoreKlass?

*typeof* `Store$1`

### Returns

*typeof* [`ConfiguredStore`](../classes/ConfiguredStore.md)

## Call Signature

```ts
function useLegacyStore<T extends Cache>(options: LegacyModelAndNetworkAndRequestStoreSetupOptions<T>, StoreKlass?: typeof Store$1): typeof ConfiguredStore;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:293](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/index.ts#L293)

Use the legacy store with the given options.

See [LegacyStoreSetupOptions](../types/LegacyStoreSetupOptions.md) for details on the available options.

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  schemas: [],
});
```

### Adding Stateful Handlers

A request Handler is sometimes more than a plain object or class
with a `request` method — it may need access to a stateful dependency such
as an Ember service (an auth token, a feature-flags service, an i18n
helper, etc.).

A plain class handler that only relies on Ember's `@service` decorator will
not work here on its own: the handler is never instantiated *through*
Ember's container (it's just `new`'d up), so it has no owner and its
`@service` injections would fail to resolve.

Instead, give `handlers` a function. It receives the Store instance
being configured, which by the time the function runs already has an owner
assigned. Use `getOwner`/`setOwner` from `@ember/owner` to transfer that
owner onto your handler instance before returning it, exactly as you would
when constructing any other DI-aware object outside of the container:

```ts
import { getOwner, setOwner } from '@ember/owner';
import { service } from '@ember/service';
import { useLegacyStore } from '@warp-drive/legacy';
import type { NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { JSONAPICache } from '@warp-drive/json-api';

class AuthHandler {
  @service session;

  request<T>(context: RequestContext, next: NextFn<T>) {
    const headers = new Headers(context.request.headers);
    headers.append('Authorization', `Bearer ${this.session.accessToken}`);
    return next(Object.assign({}, context.request, { headers }));
  }
}

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  handlers: (store) => {
    const authHandler = new AuthHandler();
    setOwner(authHandler, getOwner(store)!);
    return [authHandler];
  },
});
```

The `handlers` function is invoked lazily and only once per store instance,
the first time `store.requestManager` is accessed, so it is safe to do
owner-dependent setup like this inside of it.

### Accessing the Store from a Handler's Context

If a handler only needs to read something *off of the store itself*
(its cache, or a property/service you've attached to a custom store
subclass) rather than an unrelated Ember service, there is a second,
simpler option that requires no DI/`setOwner` wiring at all.

Every request issued via Store.request | store.request(...)
automatically carries the originating store along as
RequestInfo.store | context.request.store. Any handler — a plain
object, a function-built handler, or a class — can read it directly,
without needing the `handlers` callback form shown above:

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import type { NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { JSONAPICache } from '@warp-drive/json-api';

const LoggingHandler = {
  request<T>(context: RequestContext, next: NextFn<T>) {
    // only present when the request was made via `store.request(...)`
    const store = context.request.store;
    if (store) {
      console.log(`[${store.constructor.name}] ${context.request.url ?? ''}`);
    }
    return next(context.request);
  },
};

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  handlers: [LoggingHandler],
});
```

The trade-off versus the `getOwner`/`setOwner` pattern above is that
`context.request.store` is only populated for requests issued via
`store.request(...)`; a request made directly against a
[RequestManager](../../core/classes/RequestManager.md) won't have it set unless the caller supplies it
explicitly, so a handler relying on it should treat it as optional (as
`LoggingHandler` does above).

### Type Parameters

#### T

`T` *extends* `Cache`

### Parameters

#### options

[`LegacyModelAndNetworkAndRequestStoreSetupOptions`](../types/LegacyModelAndNetworkAndRequestStoreSetupOptions.md)<`T`>

#### StoreKlass?

*typeof* `Store$1`

### Returns

*typeof* [`ConfiguredStore`](../classes/ConfiguredStore.md)
