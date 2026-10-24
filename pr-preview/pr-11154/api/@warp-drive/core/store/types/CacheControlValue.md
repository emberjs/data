---
url: /pr-preview/pr-11154/api/@warp-drive/core/store/types/CacheControlValue.md
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

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:66](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L66)

Interface of a parsed Cache-Control header value.

* [MDN Cache-Control Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

## Properties

### immutable?

```ts
optional immutable?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:68](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L68)

Indicates the response will never change; parsed but not currently used by this cache policy's expiration logic.

***

### max-age?

```ts
optional max-age?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:70](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L70)

Seconds since the response's `Date` that it is considered fresh; combined with the `Age` header to determine expiration.

***

### must-revalidate?

```ts
optional must-revalidate?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:72](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L72)

Indicates a stale response must be revalidated before use; parsed but not currently used by this cache policy's expiration logic.

***

### must-understand?

```ts
optional must-understand?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:74](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L74)

Indicates the client must understand the response's status code semantics before caching; parsed but not currently used by this cache policy's expiration logic.

***

### no-cache?

```ts
optional no-cache?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:76](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L76)

Indicates the response must be revalidated before being reused from cache; parsed but not currently used by this cache policy's expiration logic.

***

### no-store?

```ts
optional no-store?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:78](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L78)

Indicates the response must not be stored in any cache; parsed but not currently used by this cache policy's expiration logic.

***

### no-transform?

```ts
optional no-transform?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:80](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L80)

Indicates the response must not be transformed by intermediaries; parsed but not currently used by this cache policy's expiration logic.

***

### only-if-cached?

```ts
optional only-if-cached?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:82](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L82)

Indicates only an already-cached response should be used; parsed but not currently used by this cache policy's expiration logic.

***

### private?

```ts
optional private?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:84](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L84)

Indicates the response is intended for a single user and should not be stored by shared caches; parsed but not currently used by this cache policy's expiration logic.

***

### proxy-revalidate?

```ts
optional proxy-revalidate?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:86](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L86)

Like `must-revalidate` but only for shared caches; parsed but not currently used by this cache policy's expiration logic.

***

### public?

```ts
optional public?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:88](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L88)

Indicates the response may be stored by any cache; parsed but not currently used by this cache policy's expiration logic.

***

### s-maxage?

```ts
optional s-maxage?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:90](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L90)

Seconds since the response's `Date` that it is considered fresh for shared caches; used as a fallback for `max-age` when determining expiration.

***

### stale-if-error?

```ts
optional stale-if-error?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:92](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L92)

Seconds a stale response may be reused if an error occurs while revalidating; parsed but not currently used by this cache policy's expiration logic.

***

### stale-while-revalidate?

```ts
optional stale-while-revalidate?: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:94](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L94)

Seconds a stale response may be reused while a revalidation happens in the background; parsed but not currently used by this cache policy's expiration logic.
