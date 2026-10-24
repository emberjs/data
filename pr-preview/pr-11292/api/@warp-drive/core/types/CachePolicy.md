---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/CachePolicy.md
---

# &#x20;CachePolicy

```ts
interface CachePolicy {
  didRequest?(request: ImmutableRequestInfo, response: 
  | Response
  | ResponseInfo
  | null, identifier: RequestKey | null, store: Store): void;
  isHardExpired(identifier: RequestKey, store: Store): boolean;
  isSoftExpired(identifier: RequestKey, store: Store): boolean;
  willRequest?(request: ImmutableRequestInfo, identifier: RequestKey | null, store: Store): void;
}
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/types.ts:18](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/cache-handler/types.ts#L18)

A service which an application may provide to the store via
the store's `lifetimes` property to configure the behavior
of the CacheHandler.

The default behavior for request lifetimes is to never expire
unless manually refreshed via `cacheOptions.reload` or `cacheOptions.backgroundReload`.

Implementing this service allows you to programatically define
when a request should be considered expired.

## Methods

### didRequest()?

```ts
optional didRequest(
   request: ImmutableRequestInfo, 
   response: 
  | Response
  | ResponseInfo
  | null, 
   identifier: RequestKey | null, 
   store: Store
): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/types.ts:86](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/cache-handler/types.ts#L86)

Invoked when a request has been fulfilled from the configured request handlers.
This is invoked for both foreground and background requests once the cache has
been updated.

Note, this is invoked regardless of whether the request has a cache-key.

It is best practice to notify the store of any requests marked as invalidated
so that request subscriptions can reload when needed.

```ts
store.notifications.notify(identifier, 'invalidated', null);
```

This allows anything subscribed to the request to be notified of the change

e.g.

```ts
store.notifications.subscribe(identifier, (_, type) => {
  if (type === 'invalidated') {
    // do update
  }
});
```

#### Parameters

##### request

[`ImmutableRequestInfo`](request/types/ImmutableRequestInfo.md)

##### response

| [`Response`](https://developer.mozilla.org/docs/Web/API/Response)
| [`ResponseInfo`](request/types/ResponseInfo.md)
| `null`

##### identifier

[`RequestKey`](identifier/types/RequestKey.md) | `null`

##### store

[`Store`](../classes/Store.md)

#### Returns

`void`

***

### isHardExpired()

```ts
isHardExpired(identifier: RequestKey, store: Store): boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/types.ts:32](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/cache-handler/types.ts#L32)

Invoked to determine if the request may be fulfilled from cache
if possible.

Note, this is only invoked if the request has a cache-key.

If no cache entry is found or the entry is hard expired,
the request will be fulfilled from the configured request handlers
and the cache will be updated before returning the response.

#### Parameters

##### identifier

[`RequestKey`](identifier/types/RequestKey.md)

##### store

[`Store`](../classes/Store.md)

#### Returns

`boolean`

true if the request is considered hard expired

***

### isSoftExpired()

```ts
isSoftExpired(identifier: RequestKey, store: Store): boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/types.ts:45](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/cache-handler/types.ts#L45)

Invoked if `isHardExpired` is false to determine if the request
should be update behind the scenes if cache data is already available.

Note, this is only invoked if the request has a cache-key.

If true, the request will be fulfilled from cache while a backgrounded
request is made to update the cache via the configured request handlers.

#### Parameters

##### identifier

[`RequestKey`](identifier/types/RequestKey.md)

##### store

[`Store`](../classes/Store.md)

#### Returns

`boolean`

true if the request is considered soft expired

***

### willRequest()?

```ts
optional willRequest(
   request: ImmutableRequestInfo, 
   identifier: RequestKey | null, 
   store: Store
): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/types.ts:55](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-private/cache-handler/types.ts#L55)

Invoked when a request will be sent to the configured request handlers.
This is invoked for both foreground and background requests.

Note, this is invoked regardless of whether the request has a cache-key.

#### Parameters

##### request

[`ImmutableRequestInfo`](request/types/ImmutableRequestInfo.md)

##### identifier

[`RequestKey`](identifier/types/RequestKey.md) | `null`

##### store

[`Store`](../classes/Store.md)

#### Returns

`void`
