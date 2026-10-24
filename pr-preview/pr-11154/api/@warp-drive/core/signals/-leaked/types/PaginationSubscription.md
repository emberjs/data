---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/PaginationSubscription.md
---

# &#x20;PaginationSubscription\<RT, E>&#x20;

```ts
interface PaginationSubscription<RT, E> {
  store: 
  | Store
  | RequestManager;
  get contentFeatures(): PaginationContentFeatures<RT>;
  get errorFeatures(): ErrorFeatures;
  get isCancelled(): boolean;
  get isError(): boolean;
  get isIdle(): boolean;
  get isLoading(): boolean;
  get isNavigating(): boolean;
  get isSuccess(): boolean;
  get loadingState(): RequestLoadingState;
  get paginationState(): PaginationState<RT, E>;
  get reason(): 
  | StructuredErrorDocument<E>
  | null;
  (symbol) dispose(): void;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:102](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L102)

**`Hideconstructor`**

Lifecycle glue for the `<Paginate />` component. Owns the initial
[RequestSubscription](../../../reactive/types/RequestSubscription.md) (loading/error state, autorefresh, disposal) and
the per-component [PaginationState](PaginationState.md) that it hands to the component.

## Type Parameters

### RT

`RT`

### E

`E`

## Methods

### (symbol) dispose()

```ts
(symbol) dispose(): void;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:107](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L107)

The method to call when the component this subscription is attached to
unmounts.

#### Returns

`void`

## Properties

### store

```ts
store: 
  | Store
  | RequestManager;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:130](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L130)

The Store this subscription subscribes to or the RequestManager
which issues this request.

### contentFeatures

#### Get Signature

```ts
get contentFeatures(): PaginationContentFeatures<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:360](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L360)

Content features to yield to the content slot of a component

##### Returns

[`PaginationContentFeatures`](PaginationContentFeatures.md)<`RT`>

***

### errorFeatures

#### Get Signature

```ts
get errorFeatures(): ErrorFeatures;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:348](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L348)

Error features to yield to the error slot of a component

##### Returns

`ErrorFeatures`

***

### isCancelled

#### Get Signature

```ts
get isCancelled(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:324](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L324)

Whether the initial request was cancelled (aborted).

##### Returns

`boolean`

***

### isError

#### Get Signature

```ts
get isError(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:332](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L332)

Whether the initial request rejected with an error.

##### Returns

`boolean`

***

### isIdle

#### Get Signature

```ts
get isIdle(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:265](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L265)

Whether there is no request or query to monitor, so the component has
nothing to load.

##### Returns

`boolean`

***

### isLoading

#### Get Signature

```ts
get isLoading(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:282](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L282)

Whether the collection is still blocking-loading: no [PaginationState](PaginationState.md)
has finished setting up yet. Only the very first page load (or the reset
to a different collection) blocks here — extending the collection with
`loadNext`/`loadPrev` does not, and neither does a changed `@request` arg
while a collection is already on screen (that is [isNavigating](#isnavigating)).

Remains `true` for the moment between the request resolving and the
[paginationState](#paginationstate) finishing its setup from the response, so that
[isSuccess](#issuccess) consumers never see a success state with an empty
pagination surface.

##### Returns

`boolean`

***

### isNavigating

#### Get Signature

```ts
get isNavigating(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:295](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L295)

Whether a changed `@request` arg is resolving while a collection is
already on screen — route-driven navigation, e.g. the browser back
button. The content stays rendered (see [isSuccess](#issuccess)); consumers can
use this to show a lightweight navigation indicator, the same way a
`loadPage` call surfaces through the active page's request state.

##### Returns

`boolean`

***

### isSuccess

#### Get Signature

```ts
get isSuccess(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:315](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L315)

Whether the component has a set-up [paginationState](#paginationstate) to render and
the current request did not fail. Stays `true` while a changed `@request`
arg resolves ([isNavigating](#isnavigating)), so the existing content keeps
rendering instead of falling back to a blocking loading state.

##### Returns

`boolean`

***

### loadingState

#### Get Signature

```ts
get loadingState(): RequestLoadingState;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:304](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L304)

The [RequestLoadingState](../../../reactive/types/RequestLoadingState.md) for the initial request, for building UIs
that respond to download progress.

##### Returns

[`RequestLoadingState`](../../../reactive/types/RequestLoadingState.md)

***

### paginationState

#### Get Signature

```ts
get paginationState(): PaginationState<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:197](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L197)

The per-component pagination state yielded to the component.

Keyed to the request that started the collection, not the current
`@request` arg: when the arg changes, the existing state keeps rendering
while \_resolveNavigation resolves the new request in the
background. A request that resolves to a page of the same collection is
adopted into this state as the new active page (route-driven navigation,
e.g. the browser back button); one that resolves to a different
collection swaps in a fresh state (a true reset).

A background `refresh` does not swap the request, so the pagination
state is stable across refreshes.

##### Returns

[`PaginationState`](PaginationState.md)<`RT`, `E`>

***

### reason

#### Get Signature

```ts
get reason(): 
  | StructuredErrorDocument<E>
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:340](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-subscription.ts#L340)

The error the initial request rejected with, or `null` if it did not reject.

##### Returns

| [`StructuredErrorDocument`](../../../types/request/types/StructuredErrorDocument.md)<`E`>
| `null`
