---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/functions/useRecommendedStore.md
---

# &#x20;useRecommendedStore()

```ts
function useRecommendedStore<T extends Cache, Policy extends CachePolicy>(options: StoreSetupOptions<T> & {
  policy: Policy;
}, StoreKlass?: typeof Store): typeof ConfiguredStore;
function useRecommendedStore<T extends Cache>(options: StoreSetupOptions<T> & {
  policy?: undefined;
}, StoreKlass?: typeof Store): typeof ConfiguredStore;
function useRecommendedStore<T extends Cache>(options: StoreSetupOptions<T>, StoreKlass?: typeof Store): typeof ConfiguredStore;
```

## Call Signature

```ts
function useRecommendedStore<T extends Cache, Policy extends CachePolicy>(options: StoreSetupOptions<T> & {
  policy: Policy;
}, StoreKlass?: typeof Store): typeof ConfiguredStore;
```

Defined in: [warp-drive-packages/core/src/index.ts:268](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/index.ts#L268)

Creates a configured Store class with recommended defaults
for schema handling, reactivity, caching, and request management.

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export const Store = useRecommendedStore({
  cache: JSONAPICache,
  schemas: [],
});
```

### Adding Stateful Handlers

A request [Handler](../request/types/Handler.md) is sometimes more than a plain object or class with
a `request` method — it may need access to a stateful dependency such as an
Ember service (an auth token, a feature-flags service, an i18n helper, etc.).

A plain class handler that only relies on Ember's `@service` decorator will
not work here on its own: the handler is never instantiated *through* Ember's
container (it's just `new`'d up), so it has no owner and its `@service`
injections would fail to resolve.

Instead, give [handlers](../types/StoreSetupOptions.md#handlers) a function. It
receives the [Store](../classes/Store.md) instance being configured, which by the time the
function runs already has an owner assigned. Use `getOwner`/`setOwner` from
`@ember/owner` to transfer that owner onto your handler instance before
returning it, exactly as you would when constructing any other DI-aware
object outside of the container:

```ts
import { getOwner, setOwner } from '@ember/owner';
import { service } from '@ember/service';
import { useRecommendedStore } from '@warp-drive/core';
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

export default useRecommendedStore({
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

Every request issued via [store.request(...)](../classes/Store.md#request)
automatically carries the originating store along as
[context.request.store](../types/request/types/RequestInfo.md#store). Any handler — a plain
object, a function-built handler, or a class — can read it directly,
without needing the `handlers` callback form shown above:

```ts
import { useRecommendedStore } from '@warp-drive/core';
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

export default useRecommendedStore({
  cache: JSONAPICache,
  handlers: [LoggingHandler],
});
```

The trade-off versus the `getOwner`/`setOwner` pattern above is that
`context.request.store` is only populated for requests issued via
`store.request(...)`; a request made directly against a
[RequestManager](../classes/RequestManager.md) won't have it set unless the caller supplies it
explicitly, so a handler relying on it should treat it as optional (as
`LoggingHandler` does above).

### Type Parameters

#### T

`T` *extends* [`Cache`](../types/cache/types/Cache.md)

#### Policy

`Policy` *extends* [`CachePolicy`](../types/CachePolicy.md)

### Parameters

#### options

[`StoreSetupOptions`](../types/StoreSetupOptions.md)<`T`> & {
`policy`: `Policy`;
}

#### StoreKlass?

*typeof* [`Store`](../classes/Store.md)

### Returns

*typeof* [`ConfiguredStore`](../classes/ConfiguredStore.md)

## Call Signature

```ts
function useRecommendedStore<T extends Cache>(options: StoreSetupOptions<T> & {
  policy?: undefined;
}, StoreKlass?: typeof Store): typeof ConfiguredStore;
```

Defined in: [warp-drive-packages/core/src/index.ts:272](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/index.ts#L272)

Creates a configured Store class with recommended defaults
for schema handling, reactivity, caching, and request management.

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export const Store = useRecommendedStore({
  cache: JSONAPICache,
  schemas: [],
});
```

### Adding Stateful Handlers

A request [Handler](../request/types/Handler.md) is sometimes more than a plain object or class with
a `request` method — it may need access to a stateful dependency such as an
Ember service (an auth token, a feature-flags service, an i18n helper, etc.).

A plain class handler that only relies on Ember's `@service` decorator will
not work here on its own: the handler is never instantiated *through* Ember's
container (it's just `new`'d up), so it has no owner and its `@service`
injections would fail to resolve.

Instead, give [handlers](../types/StoreSetupOptions.md#handlers) a function. It
receives the [Store](../classes/Store.md) instance being configured, which by the time the
function runs already has an owner assigned. Use `getOwner`/`setOwner` from
`@ember/owner` to transfer that owner onto your handler instance before
returning it, exactly as you would when constructing any other DI-aware
object outside of the container:

```ts
import { getOwner, setOwner } from '@ember/owner';
import { service } from '@ember/service';
import { useRecommendedStore } from '@warp-drive/core';
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

export default useRecommendedStore({
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

Every request issued via [store.request(...)](../classes/Store.md#request)
automatically carries the originating store along as
[context.request.store](../types/request/types/RequestInfo.md#store). Any handler — a plain
object, a function-built handler, or a class — can read it directly,
without needing the `handlers` callback form shown above:

```ts
import { useRecommendedStore } from '@warp-drive/core';
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

export default useRecommendedStore({
  cache: JSONAPICache,
  handlers: [LoggingHandler],
});
```

The trade-off versus the `getOwner`/`setOwner` pattern above is that
`context.request.store` is only populated for requests issued via
`store.request(...)`; a request made directly against a
[RequestManager](../classes/RequestManager.md) won't have it set unless the caller supplies it
explicitly, so a handler relying on it should treat it as optional (as
`LoggingHandler` does above).

### Type Parameters

#### T

`T` *extends* [`Cache`](../types/cache/types/Cache.md)

### Parameters

#### options

[`StoreSetupOptions`](../types/StoreSetupOptions.md)<`T`> & {
`policy?`: `undefined`;
}

#### StoreKlass?

*typeof* [`Store`](../classes/Store.md)

### Returns

*typeof* [`ConfiguredStore`](../classes/ConfiguredStore.md)

## Call Signature

```ts
function useRecommendedStore<T extends Cache>(options: StoreSetupOptions<T>, StoreKlass?: typeof Store): typeof ConfiguredStore;
```

Defined in: [warp-drive-packages/core/src/index.ts:276](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/index.ts#L276)

Creates a configured Store class with recommended defaults
for schema handling, reactivity, caching, and request management.

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export const Store = useRecommendedStore({
  cache: JSONAPICache,
  schemas: [],
});
```

### Adding Stateful Handlers

A request [Handler](../request/types/Handler.md) is sometimes more than a plain object or class with
a `request` method — it may need access to a stateful dependency such as an
Ember service (an auth token, a feature-flags service, an i18n helper, etc.).

A plain class handler that only relies on Ember's `@service` decorator will
not work here on its own: the handler is never instantiated *through* Ember's
container (it's just `new`'d up), so it has no owner and its `@service`
injections would fail to resolve.

Instead, give [handlers](../types/StoreSetupOptions.md#handlers) a function. It
receives the [Store](../classes/Store.md) instance being configured, which by the time the
function runs already has an owner assigned. Use `getOwner`/`setOwner` from
`@ember/owner` to transfer that owner onto your handler instance before
returning it, exactly as you would when constructing any other DI-aware
object outside of the container:

```ts
import { getOwner, setOwner } from '@ember/owner';
import { service } from '@ember/service';
import { useRecommendedStore } from '@warp-drive/core';
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

export default useRecommendedStore({
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

Every request issued via [store.request(...)](../classes/Store.md#request)
automatically carries the originating store along as
[context.request.store](../types/request/types/RequestInfo.md#store). Any handler — a plain
object, a function-built handler, or a class — can read it directly,
without needing the `handlers` callback form shown above:

```ts
import { useRecommendedStore } from '@warp-drive/core';
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

export default useRecommendedStore({
  cache: JSONAPICache,
  handlers: [LoggingHandler],
});
```

The trade-off versus the `getOwner`/`setOwner` pattern above is that
`context.request.store` is only populated for requests issued via
`store.request(...)`; a request made directly against a
[RequestManager](../classes/RequestManager.md) won't have it set unless the caller supplies it
explicitly, so a handler relying on it should treat it as optional (as
`LoggingHandler` does above).

### Type Parameters

#### T

`T` *extends* [`Cache`](../types/cache/types/Cache.md)

### Parameters

#### options

[`StoreSetupOptions`](../types/StoreSetupOptions.md)<`T`>

#### StoreKlass?

*typeof* [`Store`](../classes/Store.md)

### Returns

*typeof* [`ConfiguredStore`](../classes/ConfiguredStore.md)
