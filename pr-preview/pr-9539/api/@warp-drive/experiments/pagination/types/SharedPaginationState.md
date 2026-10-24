---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/experiments/pagination/types/SharedPaginationState.md
description: >-
  Experimental: the pagination state members available in both paged and
  infinite mode, namely `totalPages` and `adoptPage`.
---

&#x20;

# &#x20;SharedPaginationState\<RT = `unknown`, E = `unknown`>

```ts
interface SharedPaginationState<RT = unknown, E = unknown> {
  readonly totalPages: number;
  adoptPage(request: Future<RT>): Promise<RT | null>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:30](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L30)

The part of a [PaginationState](PaginationState.md) available to both navigation surfaces.

## Extended by

* [`PagedPaginationState`](PagedPaginationState.md)
* [`InfinitePaginationState`](InfinitePaginationState.md)

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

## Properties

### totalPages

```ts
readonly totalPages: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:32](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/signals/pagination-state.ts#L32)

See [PaginationState.totalPages](PaginationState.md#totalpages).
