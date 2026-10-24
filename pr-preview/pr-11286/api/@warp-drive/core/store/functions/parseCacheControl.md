---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/store/functions/parseCacheControl.md
---

# &#x20;parseCacheControl()

```ts
function parseCacheControl(header: string): CacheControlValue;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:127](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L127)

Parses a string Cache-Control header value into an object with the following structure:

```ts
interface CacheControlValue {
  immutable?: boolean;
  'max-age'?: number;
  'must-revalidate'?: boolean;
  'must-understand'?: boolean;
  'no-cache'?: boolean;
  'no-store'?: boolean;
  'no-transform'?: boolean;
  'only-if-cached'?: boolean;
  private?: boolean;
  'proxy-revalidate'?: boolean;
  public?: boolean;
  's-maxage'?: number;
  'stale-if-error'?: number;
  'stale-while-revalidate'?: number;
}
```

See also [CacheControlValue](../types/CacheControlValue.md) and [Response Directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#response_directives)

## Parameters

### header

`string`

## Returns

[`CacheControlValue`](../types/CacheControlValue.md)
