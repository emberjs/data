---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/experiments/pagination/types/PaginationSubscription.md
---

&#x20;

# &#x20;PaginationSubscription\<RT, E>&#x20;

```ts
interface PaginationSubscription<RT, E> {
  store: Store$1 | RequestManager;
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
  get reason(): StructuredErrorDocument<E> | null;
  (symbol) dispose(): void;
}
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:826](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L826)

**`Hideconstructor`**

Lifecycle glue for the `<Paginate />` component. Owns the initial
RequestSubscription (loading/error state, autorefresh, disposal) and
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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:831](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L831)

The method to call when the component this subscription is attached to
unmounts.

#### Returns

`void`

## Properties

### store

```ts
store: Store$1 | RequestManager;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:847](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L847)

The Store this subscription subscribes to or the RequestManager
which issues this request.

### contentFeatures

#### Get Signature

```ts
get contentFeatures(): PaginationContentFeatures<RT>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:921](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L921)

Content features to yield to the content slot of a component

##### Returns

[`PaginationContentFeatures`](PaginationContentFeatures.md)<`RT`>

***

### errorFeatures

#### Get Signature

```ts
get errorFeatures(): ErrorFeatures;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:917](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L917)

Error features to yield to the error slot of a component

##### Returns

`ErrorFeatures`

***

### isCancelled

#### Get Signature

```ts
get isCancelled(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:905](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L905)

Whether the initial request was cancelled (aborted).

##### Returns

`boolean`

***

### isError

#### Get Signature

```ts
get isError(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:909](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L909)

Whether the initial request rejected with an error.

##### Returns

`boolean`

***

### isIdle

#### Get Signature

```ts
get isIdle(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:868](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L868)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:881](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L881)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:889](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L889)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:901](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L901)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:894](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L894)

The RequestLoadingState for the initial request, for building UIs
that respond to download progress.

##### Returns

`RequestLoadingState`

***

### paginationState

#### Get Signature

```ts
get paginationState(): PaginationState<RT, E>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:863](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L863)

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
get reason(): StructuredErrorDocument<E> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:913](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L913)

The error the initial request rejected with, or `null` if it did not reject.

##### Returns

`StructuredErrorDocument`<`E`> | `null`
