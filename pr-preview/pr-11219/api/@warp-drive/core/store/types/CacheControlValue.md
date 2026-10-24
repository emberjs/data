---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/store/types/CacheControlValue.md
description: >-
  The directives of a `Cache-Control` header as an object of flags and second
  counts, as returned by `parseCacheControl`.
---

# &#x20;CacheControlValue

```ts
interface CacheControlValue {
  immutable?: boolean;
  max-age?: number;
  must-revalidate?: boolean;
  must-understand?: boolean;
  no-cache?: boolean;
  no-store?: boolean;
  no-transform?: boolean;
  only-if-cached?: boolean;
  private?: boolean;
  proxy-revalidate?: boolean;
  public?: boolean;
  s-maxage?: number;
  stale-if-error?: number;
  stale-while-revalidate?: number;
}
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:69](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L69)

Interface of a parsed Cache-Control header value.

* [MDN Cache-Control Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

## Properties

### immutable?

```ts
optional immutable?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:71](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L71)

Indicates the response will never change; parsed but not currently used by this cache policy's expiration logic.

***

### max-age?

```ts
optional max-age?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:73](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L73)

Seconds since the response's `Date` that it is considered fresh; combined with the `Age` header to determine expiration.

***

### must-revalidate?

```ts
optional must-revalidate?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:75](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L75)

Indicates a stale response must be revalidated before use; parsed but not currently used by this cache policy's expiration logic.

***

### must-understand?

```ts
optional must-understand?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:77](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L77)

Indicates the client must understand the response's status code semantics before caching; parsed but not currently used by this cache policy's expiration logic.

***

### no-cache?

```ts
optional no-cache?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:79](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L79)

Indicates the response must be revalidated before being reused from cache; parsed but not currently used by this cache policy's expiration logic.

***

### no-store?

```ts
optional no-store?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:81](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L81)

Indicates the response must not be stored in any cache; parsed but not currently used by this cache policy's expiration logic.

***

### no-transform?

```ts
optional no-transform?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:83](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L83)

Indicates the response must not be transformed by intermediaries; parsed but not currently used by this cache policy's expiration logic.

***

### only-if-cached?

```ts
optional only-if-cached?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:85](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L85)

Indicates only an already-cached response should be used; parsed but not currently used by this cache policy's expiration logic.

***

### private?

```ts
optional private?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:87](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L87)

Indicates the response is intended for a single user and should not be stored by shared caches; parsed but not currently used by this cache policy's expiration logic.

***

### proxy-revalidate?

```ts
optional proxy-revalidate?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:89](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L89)

Like `must-revalidate` but only for shared caches; parsed but not currently used by this cache policy's expiration logic.

***

### public?

```ts
optional public?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:91](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L91)

Indicates the response may be stored by any cache; parsed but not currently used by this cache policy's expiration logic.

***

### s-maxage?

```ts
optional s-maxage?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:93](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L93)

Seconds since the response's `Date` that it is considered fresh for shared caches; used as a fallback for `max-age` when determining expiration.

***

### stale-if-error?

```ts
optional stale-if-error?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:95](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L95)

Seconds a stale response may be reused if an error occurs while revalidating; parsed but not currently used by this cache policy's expiration logic.

***

### stale-while-revalidate?

```ts
optional stale-while-revalidate?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:97](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L97)

Seconds a stale response may be reused while a revalidation happens in the background; parsed but not currently used by this cache policy's expiration logic.
