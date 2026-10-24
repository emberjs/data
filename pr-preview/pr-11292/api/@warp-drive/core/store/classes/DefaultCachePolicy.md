---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/store/classes/DefaultCachePolicy.md
---

# &#x20;DefaultCachePolicy

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:549](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L549)

A basic [CachePolicy](../../types/CachePolicy.md) that can be added to the Store service.

```ts [app/services/store.ts]
import { Store } from '@warp-drive/core';
import { DefaultCachePolicy } from '@warp-drive/core/store'; // [!code focus]

export default class AppStore extends Store {
  lifetimes = new DefaultCachePolicy({ // [!code focus:5]
    apiCacheSoftExpires: 30_000,
    apiCacheHardExpires: 60_000,
    // ... Other PolicyConfig Settings ... //
  });
}
```

:::tip 💡 TIP
Date headers do not have millisecond precision, so expiration times should
generally be larger than 1000ms.
:::

See also [PolicyConfig](../types/PolicyConfig.md) for configuration options.

### The Mechanics

This policy determines staleness based on various configurable constraints falling back to a simple
check of the time elapsed since the request was last received from the API using the `date` header
from the last response.

:::tip 💡 TIP
The [Fetch](../../variables/Fetch.md) handler provided by `@warp-drive/core` will automatically
add the `date` header to responses if it is not present.
:::

* For manual override of reload see [cacheOptions.reload](../../types/request/types/CacheOptions.md#reload)
* For manual override of background reload see [cacheOptions.backgroundReload](../../types/request/types/CacheOptions.md#backgroundreload)

In order expiration is determined by:

```md
Is explicitly invalidated by `cacheOptions.reload`
  ↳ (if falsey) if the request has been explicitly invalidated
     since the last request (see Automatic Invalidation below)
  ↳ (if false) (If Active) isExpired function
  ↳ (if null) (If Active) X-WarpDrive-Expires header
  ↳ (if null) (If Active) Cache-Control header
  ↳ (if null) (If Active) Expires header
  ↳ (if null) Date header + apiCacheHardExpires < current time

  -- <if above is false, a background request is issued if> --

  ↳ is invalidated by `cacheOptions.backgroundReload`
  ↳ (if falsey) Date header + apiCacheSoftExpires < current time
```

### Automatic Invalidation / Entanglement

It also invalidates any request with an [OpCode](../../types/request/types/RequestInfo.md#op) of `"query"`
for which [cacheOptions.types](../../types/request/types/CacheOptions.md#types) was provided
when a request with an `OpCode` of `"createRecord"` is successful and also includes
a matching type in its own `cacheOptions.types` array.

:::tip 💡 TIP
Abstracting this behavior via builders is recommended to ensure consistency.
:::

### Testing

In Testing environments:

* `apiCacheSoftExpires` will always be `false`
* `apiCacheHardExpires` will use the `apiCacheSoftExpires` value.

This helps reduce flakiness and produce predictably rendered results in test suites.

Requests that specifically set `cacheOptions.backgroundReload = true` will
still be background reloaded in tests.

This behavior can be opted out of by setting `disableTestOptimization = true`
in the policy config.

## Implements

* [`CachePolicy`](../../types/CachePolicy.md)

## Constructors

### Constructor

```ts
new DefaultCachePolicy(config: PolicyConfig): DefaultCachePolicy;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:574](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L574)

#### Parameters

##### config

[`PolicyConfig`](../types/PolicyConfig.md)

#### Returns

`DefaultCachePolicy`

## Methods

### didRequest()

```ts
didRequest(
   request: ImmutableRequestInfo, 
   response: 
  | Response
  | ResponseInfo
  | null, 
   cacheKey: RequestKey | null, 
   store: Store
): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:658](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L658)

Invoked when a request has been fulfilled from the configured request handlers.
This is invoked by the CacheHandler for both foreground and background requests
once the cache has been updated.

Note, this is invoked by the [CacheHandler](../../variables/CacheHandler.md) regardless of whether
the request has a cache-key.

This method should not be invoked directly by consumers.

#### Parameters

##### request

[`ImmutableRequestInfo`](../../types/request/types/ImmutableRequestInfo.md)

##### response

| [`Response`](https://developer.mozilla.org/docs/Web/API/Response)
| [`ResponseInfo`](../../types/request/types/ResponseInfo.md)
| `null`

##### cacheKey

[`RequestKey`](../../types/identifier/types/RequestKey.md) | `null`

##### store

`Store`

#### Returns

`void`

#### Implementation of

[`CachePolicy`](../../types/CachePolicy.md).[`didRequest`](../../types/CachePolicy.md#didrequest)

***

### invalidateRequest()

```ts
invalidateRequest(cacheKey: RequestKey, store: Store): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:610](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L610)

Invalidate a request by its CacheKey for the given store instance.

While the store argument may seem redundant, the CachePolicy
is designed to be shared across multiple stores / forks
of the store.

```ts
store.lifetimes.invalidateRequest(store, cacheKey);
```

#### Parameters

##### cacheKey

[`RequestKey`](../../types/identifier/types/RequestKey.md)

##### store

`Store`

#### Returns

`void`

***

### invalidateRequestsForType()

```ts
invalidateRequestsForType(type: string, store: Store): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:631](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L631)

Invalidate all requests associated to a specific type
for a given store instance.

While the store argument may seem redundant, the CachePolicy
is designed to be shared across multiple stores / forks
of the store.

This invalidation is done automatically when using this service
for both the [CacheHandler](../../variables/CacheHandler.md) and the [NetworkHandler](/api/@warp-drive/legacy/compat/variables/LegacyNetworkHandler).

```ts
store.lifetimes.invalidateRequestsForType(store, 'person');
```

#### Parameters

##### type

`string`

##### store

`Store`

#### Returns

`void`

***

### isHardExpired()

```ts
isHardExpired(cacheKey: RequestKey, store: Store): boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:709](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L709)

Invoked to determine if the request may be fulfilled from cache
if possible.

Note, this is only invoked by the [CacheHandler](../../variables/CacheHandler.md) if the request has
a cache-key.

If no cache entry is found or the entry is hard expired,
the request will be fulfilled from the configured request handlers
and the cache will be updated before returning the response.

#### Parameters

##### cacheKey

[`RequestKey`](../../types/identifier/types/RequestKey.md)

##### store

`Store`

#### Returns

`boolean`

true if the request is considered hard expired

#### Implementation of

[`CachePolicy`](../../types/CachePolicy.md).[`isHardExpired`](../../types/CachePolicy.md#ishardexpired)

***

### isSoftExpired()

```ts
isSoftExpired(cacheKey: RequestKey, store: Store): boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:742](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L742)

Invoked if `isHardExpired` is false to determine if the request
should be update behind the scenes if cache data is already available.

Note, this is only invoked by the [CacheHandler](../../variables/CacheHandler.md) if the request has
a cache-key.

If true, the request will be fulfilled from cache while a backgrounded
request is made to update the cache via the configured request handlers.

#### Parameters

##### cacheKey

[`RequestKey`](../../types/identifier/types/RequestKey.md)

##### store

`Store`

#### Returns

`boolean`

true if the request is considered soft expired

#### Implementation of

[`CachePolicy`](../../types/CachePolicy.md).[`isSoftExpired`](../../types/CachePolicy.md#issoftexpired)
