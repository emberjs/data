---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/types/request/types/RequestInfo.md
description: >-
  Describes a request for `store.request` or `RequestManager.request`: native
  fetch options plus cache options, operation name, records, data, and the
  store.
---

# &#x20;RequestInfo\<RT = `unknown`>&#x20;

```ts
interface RequestInfo<RT = unknown> extends NativeRequestInit {
  ___(unique) Symbol(EnableHydration)?: boolean;
  body?: BodyInit | null;
  cache?: RequestCache;
  cacheOptions?: CacheOptions;
  controller?: AbortController;
  credentials?: RequestCredentials;
  data?: Record<string, unknown>;
  destination?: RequestDestination;
  disableTestWaiter?: boolean;
  duplex?: "half";
  headers?: Headers;
  integrity?: string;
  keepalive?: boolean;
  method?: HTTPMethod;
  mode?: RequestMode;
  op?: string;
  options?: Record<string, unknown>;
  priority?: RequestPriority;
  records?: ResourceKey[];
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal;
  store?: Store;
  url?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:681](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L681)

Extends JavaScript's native [fetch](https://developer.mozilla.org/docs/Web/API/Window/fetch) NativeRequestInit | RequestInit with additional
properties specific to the [RequestManager's](../../../classes/RequestManager.md) capabilities.

This interface is used to define the shape of a request that can be made via
either the [RequestManager.request](../../../classes/RequestManager.md#request) or [Store.request](../../../classes/Store.md#request) methods.

The [Making Requests](/guides/the-manual/requests/#request-options) guide explains
its options.

## Extends

* `NativeRequestInit`

## Type Parameters

### RT

`RT` = `unknown`

## Properties

### \_\_\_(unique) Symbol(EnableHydration)?

```ts
optional ___(unique) Symbol(EnableHydration)?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:765](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L765)

see [EnableHydration](../variables/EnableHydration.md)

***

### body?

```ts
optional body?: BodyInit | null;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:631](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L631)

Any body that you want to add to your request. Note that a GET or HEAD request may not have a body.

#### Inherited from

```ts
NativeRequestInit.body
```

***

### cache?

```ts
optional cache?: RequestCache;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:585](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L585)

Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching.

#### Inherited from

```ts
NativeRequestInit.cache
```

***

### cacheOptions?

```ts
optional cacheOptions?: CacheOptions;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:691](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L691)

#### See

[CacheOptions](CacheOptions.md)

***

### controller?

```ts
optional controller?: AbortController;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:686](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L686)

If provided, used instead of the AbortController auto-configured for each request by the RequestManager

***

### credentials?

```ts
optional credentials?: RequestCredentials;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:588](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L588)

Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL.

#### Inherited from

```ts
NativeRequestInit.credentials
```

***

### data?

```ts
optional data?: Record<string, unknown>;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:749](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L749)

data that a handler should convert into
the query (GET) or body (POST).

Note: It is recommended that builders set query params
and body directly in most scenarios.

***

### destination?

```ts
optional destination?: RequestDestination;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:591](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L591)

Returns the kind of resource requested by request, e.g., "document" or "script".

#### Inherited from

```ts
NativeRequestInit.destination
```

***

### disableTestWaiter?

```ts
optional disableTestWaiter?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:740](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L740)

If true, this request will not be tracked by test waiters.

***

### duplex?

```ts
optional duplex?: "half";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:640](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L640)

When sending a ReadableStream as the body of a request, 'half' must be
specified.

[Half Duplex Further Reading](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests#half_duplex)

#### Inherited from

```ts
NativeRequestInit.duplex
```

***

### headers?

```ts
optional headers?: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:594](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L594)

Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header.

#### Inherited from

```ts
NativeRequestInit.headers
```

***

### integrity?

```ts
optional integrity?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:597](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L597)

Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. \[SRI]

#### Inherited from

```ts
NativeRequestInit.integrity
```

***

### keepalive?

```ts
optional keepalive?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:600](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L600)

Returns a boolean indicating whether or not request can outlive the global in which it was created.

#### Inherited from

```ts
NativeRequestInit.keepalive
```

***

### method?

```ts
optional method?: HTTPMethod;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:603](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L603)

Returns request's HTTP method, which is "GET" by default.

#### Inherited from

```ts
NativeRequestInit.method
```

***

### mode?

```ts
optional mode?: RequestMode;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:609](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L609)

Returns the mode associated with request, which is a string indicating whether the request will use CORS, or will be restricted to same-origin URLs.

`no-cors` is not allowed for streaming request bodies.

#### Inherited from

```ts
NativeRequestInit.mode
```

***

### op?

```ts
optional op?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:727](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L727)

The name of the request operation, if any (e.g. `'findRecord'`, `'query'`).

***

### options?

```ts
optional options?: Record<string, unknown>;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:755](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L755)

options specifically intended for [Handlers](../../../request/types/Handler.md)
to utilize to process the request

***

### priority?

```ts
optional priority?: RequestPriority;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:613](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L613)

provides an explicit priority hint for the request.

#### Inherited from

```ts
NativeRequestInit.priority
```

***

### records?

```ts
optional records?: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:735](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L735)

The [ResourceKeys](../../identifier/types/ResourceKey.md) of the primary resources involved in the request
(if any). This may be used by handlers to perform transactional
operations on the store.

***

### redirect?

```ts
optional redirect?: RequestRedirect;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:616](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L616)

Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default.

#### Inherited from

```ts
NativeRequestInit.redirect
```

***

### referrer?

```ts
optional referrer?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:619](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L619)

Returns the referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to determine the value of the `Referer` header of the request being made.

#### Inherited from

```ts
NativeRequestInit.referrer
```

***

### referrerPolicy?

```ts
optional referrerPolicy?: ReferrerPolicy;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:622](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L622)

Returns the referrer policy associated with request. This is used during fetching to compute the value of the request's referrer.

#### Inherited from

```ts
NativeRequestInit.referrerPolicy
```

***

### signal?

```ts
optional signal?: AbortSignal;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:625](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L625)

Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler.

#### Inherited from

```ts
NativeRequestInit.signal
```

***

### store?

```ts
optional store?: Store;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:722](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L722)

The [Store](../../../classes/Store.md) the request was made against, if made via
[Store.request](../../../classes/Store.md#request) rather than directly against a [RequestManager](../../../classes/RequestManager.md).

A [Handler](../../../request/types/Handler.md) can read this off of [context.request](RequestContext.md#request)
to reach store state (the cache, other services attached to a custom
store subclass, etc.) without needing any Ember DI/`setOwner` wiring at
handler-construction time. This works for a handler of any shape (a
function, plain object, or class) because the store is attached to each
request individually rather than to the handler itself.

The trade-off is that this is only populated for requests issued via
[store.request(...)](../../../classes/Store.md#request); a request issued directly
against a [RequestManager](../../../classes/RequestManager.md) will not have it set unless the caller
supplies it explicitly. Handlers that rely on it should treat it as
optional.

#### Example

```ts
const LoggingHandler = {
  request<T>(context: RequestContext, next: NextFn<T>) {
    const store = context.request.store;
    if (store) {
      console.log(`[${store.constructor.name}] ${context.request.url ?? ''}`);
    }
    return next(context.request);
  },
};
```

***

### url?

```ts
optional url?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:628](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L628)

Returns the URL of request as a string.

#### Inherited from

```ts
NativeRequestInit.url
```
