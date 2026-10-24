---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/experiments/pagination/types/PagedPaginationContentFeatures.md
description: >-
  Experimental: the request controls `<Paginate />` yields to its content block
  in paged mode, adding `loadPage` to navigate to a page by URL.
---

&#x20;

# &#x20;PagedPaginationContentFeatures\<RT>

```ts
interface PagedPaginationContentFeatures<RT> extends SharedPaginationContentFeatures<RT> {
  abort?: () => void;
  isHidden: boolean;
  isNavigating: boolean;
  isOnline: boolean;
  isRefreshing: boolean;
  latestRequest?: Future<RT>;
  loadPage: (url: string) => Promise<RT | null>;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:49](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L49)

The content features yielded in `'paged'` mode: navigation happens by
loading a specific page.

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

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:38](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L38)

#### Returns

`void`

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`abort`](SharedPaginationContentFeatures.md#abort)

***

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:26](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L26)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isHidden`](SharedPaginationContentFeatures.md#ishidden)

***

### isNavigating

```ts
isNavigating: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:35](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L35)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:25](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L25)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isOnline`](SharedPaginationContentFeatures.md#isonline)

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:27](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L27)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`isRefreshing`](SharedPaginationContentFeatures.md#isrefreshing)

***

### latestRequest?

```ts
optional latestRequest?: Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:39](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L39)

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`latestRequest`](SharedPaginationContentFeatures.md#latestrequest)

***

### loadPage

```ts
loadPage: (url: string) => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:50](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L50)

#### Parameters

##### url

`string`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### refresh

```ts
refresh: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:36](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L36)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`refresh`](SharedPaginationContentFeatures.md#refresh)

***

### reload

```ts
reload: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:37](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/signals/pagination-subscription.ts#L37)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

#### Inherited from

[`SharedPaginationContentFeatures`](SharedPaginationContentFeatures.md).[`reload`](SharedPaginationContentFeatures.md#reload)
