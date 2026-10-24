---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/experiments/pagination/types/InfinitePaginationState.md
description: >-
  Experimental: the pagination state `<Paginate />` yields in infinite mode,
  exposing the accumulated items and pages plus `loadNext` and `loadPrev` to
  extend them.
---

&#x20;

# &#x20;InfinitePaginationState\<RT = `unknown`, E = `unknown`>

```ts
interface InfinitePaginationState<RT = unknown, E = unknown> extends SharedPaginationState<RT, E> {
  readonly data: Iterable<ContentItem<RT>>;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
  loadNext: () => Promise<RT | null>;
  loadPrev: () => Promise<RT | null>;
  readonly nextRequest: Future<RT> | null;
  readonly pages: Iterable<Readonly<PageCache<RT, E>>>;
  readonly previousRequest: Future<RT> | null;
  readonly totalPages: number;
  adoptPage(request: Future<RT>): Promise<RT | null>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:70](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L70)

The infinite (accumulated view) surface of a [PaginationState](PaginationState.md): render
[data](PaginationState.md#data), grow it with
[loadNext](PaginationState.md#loadnext)/[loadPrev](PaginationState.md#loadprev).
This is what the `<Paginate />` component yields in `'infinite'` mode.

## Extends

* [`SharedPaginationState`](SharedPaginationState.md)<`RT`, `E`>

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

## Methods

### adoptPage()

```ts
adoptPage(request: Future<RT>): Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:34](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L34)

See [PaginationState.adoptPage](PaginationState.md#adoptpage).

#### Parameters

##### request

`Future`<`RT`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

#### Inherited from

[`SharedPaginationState`](SharedPaginationState.md).[`adoptPage`](SharedPaginationState.md#adoptpage)

## Properties

### data

```ts
readonly data: Iterable<ContentItem<RT>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:72](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L72)

See [PaginationState.data](PaginationState.md#data).

***

### hasNext

```ts
readonly hasNext: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:76](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L76)

See [PaginationState.hasNext](PaginationState.md#hasnext).

***

### hasPrevious

```ts
readonly hasPrevious: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:78](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L78)

See [PaginationState.hasPrevious](PaginationState.md#hasprevious).

***

### loadNext

```ts
loadNext: () => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:84](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L84)

See [PaginationState.loadNext](PaginationState.md#loadnext).

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### loadPrev

```ts
loadPrev: () => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:86](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L86)

See [PaginationState.loadPrev](PaginationState.md#loadprev).

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### nextRequest

```ts
readonly nextRequest: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:80](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L80)

See [PaginationState.nextRequest](PaginationState.md#nextrequest).

***

### pages

```ts
readonly pages: Iterable<Readonly<PageCache<RT, E>>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:74](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L74)

See [PaginationState.pages](PaginationState.md#pages).

***

### previousRequest

```ts
readonly previousRequest: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:82](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L82)

See [PaginationState.previousRequest](PaginationState.md#previousrequest).

***

### totalPages

```ts
readonly totalPages: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:32](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L32)

See [PaginationState.totalPages](PaginationState.md#totalpages).

#### Inherited from

[`SharedPaginationState`](SharedPaginationState.md).[`totalPages`](SharedPaginationState.md#totalpages)
