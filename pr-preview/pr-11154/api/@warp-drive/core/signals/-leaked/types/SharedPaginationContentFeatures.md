---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/SharedPaginationContentFeatures.md
---

# &#x20;SharedPaginationContentFeatures\<RT>

```ts
interface SharedPaginationContentFeatures<RT> {
  abort?: () => void;
  isHidden: boolean;
  isNavigating: boolean;
  isOnline: boolean;
  isRefreshing: boolean;
  latestRequest?: Future<RT>;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:21](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L21)

The content features available in both pagination modes: the state and
controls of the initial request.

## Extended by

* [`PagedPaginationContentFeatures`](PagedPaginationContentFeatures.md)
* [`InfinitePaginationContentFeatures`](InfinitePaginationContentFeatures.md)

## Type Parameters

### RT

`RT`

## Properties

### abort?

```ts
optional abort?: () => void;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:35](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L35)

#### Returns

`void`

***

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:23](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L23)

***

### isNavigating

```ts
isNavigating: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:32](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L32)

Whether a changed `@request` arg is currently resolving against the
loaded collection — e.g. a route-driven navigation (browser back button).
The existing content stays rendered while this is `true`; once the
request resolves it either becomes the active page (same collection) or
the component resets to the new collection.

***

### isOnline

```ts
isOnline: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:22](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L22)

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:24](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L24)

***

### latestRequest?

```ts
optional latestRequest?: Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:36](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L36)

***

### refresh

```ts
refresh: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:33](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L33)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### reload

```ts
reload: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:34](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L34)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
