---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/experiments/pagination/types/InfinitePaginationContentFeatures.md
description: >-
  Experimental: the request controls `<Paginate />` yields to its content block
  in infinite mode, adding `loadNext` and `loadPrev` to extend the loaded pages.
---

&#x20;

# &#x20;InfinitePaginationContentFeatures\<RT>

```ts
interface InfinitePaginationContentFeatures<RT> extends SharedPaginationContentFeatures<RT> {
  abort?: () => void;
  isHidden: boolean;
  isNavigating: boolean;
  isOnline: boolean;
  isRefreshing: boolean;
  latestRequest?: Future<RT>;
  loadNext: () => Promise<RT | null>;
  loadPrev: () => Promise<RT | null>;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:60](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L60)

The content features yielded in `'infinite'` mode: navigation happens by
extending the loaded run at either end.

## Extends

* [`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md)<`RT`>

## Type Parameters

### RT

`RT`

## Properties

### abort?

```ts
optional abort?: () => void;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:38](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L38)

#### Returns

`void`

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`abort`](SharedPaginationContentFeatures.md#abort)

***

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:26](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L26)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isHidden`](SharedPaginationContentFeatures.md#ishidden)

***

### isNavigating

```ts
isNavigating: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:35](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L35)

Whether a changed `@request` arg is currently resolving against the
loaded collection — e.g. a route-driven navigation (browser back button).
The existing content stays rendered while this is `true`; once the
request resolves it either becomes the active page (same collection) or
the component resets to the new collection.

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isNavigating`](SharedPaginationContentFeatures.md#isnavigating)

***

### isOnline

```ts
isOnline: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:25](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L25)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isOnline`](SharedPaginationContentFeatures.md#isonline)

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:27](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L27)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isRefreshing`](SharedPaginationContentFeatures.md#isrefreshing)

***

### latestRequest?

```ts
optional latestRequest?: Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:39](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L39)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`latestRequest`](SharedPaginationContentFeatures.md#latestrequest)

***

### loadNext

```ts
loadNext: () => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:61](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L61)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### loadPrev

```ts
loadPrev: () => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:62](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L62)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### refresh

```ts
refresh: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:36](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L36)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`refresh`](SharedPaginationContentFeatures.md#refresh)

***

### reload

```ts
reload: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:37](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/pagination-subscription.ts#L37)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`reload`](SharedPaginationContentFeatures.md#reload)
