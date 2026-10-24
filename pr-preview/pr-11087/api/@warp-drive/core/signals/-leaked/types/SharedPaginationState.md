---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/signals/-leaked/types/SharedPaginationState.md
---

# &#x20;SharedPaginationState\<RT = `unknown`, E = `unknown`>

```ts
interface SharedPaginationState<RT = unknown, E = unknown> {
  readonly totalPages: number;
  adoptPage(request: Future<RT>): Promise<RT | null>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:24](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L24)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:28](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L28)

See [PaginationState.adoptPage](PaginationState.md#adoptpage).

#### Parameters

##### request

[`Future`](../../../request/types/Future.md)<`RT`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

## Properties

### totalPages

```ts
readonly totalPages: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:26](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L26)

See [PaginationState.totalPages](PaginationState.md#totalpages).
