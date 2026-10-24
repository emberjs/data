---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/experiments/pagination/types/SharedPaginationContentFeatures.md
description: >-
  Experimental: the request status flags and controls, like `isRefreshing`,
  `refresh`, and `reload`, that `<Paginate />` yields to its content block in
  both modes.
---

&#x20;

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

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:24](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L24)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:38](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L38)

#### Returns

`void`

***

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:26](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L26)

***

### isNavigating

```ts
isNavigating: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:35](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L35)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:25](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L25)

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:27](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L27)

***

### latestRequest?

```ts
optional latestRequest?: Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:39](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L39)

***

### refresh

```ts
refresh: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:36](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L36)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### reload

```ts
reload: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:37](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-subscription.ts#L37)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
