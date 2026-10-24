---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/experiments/pagination/types/PagedPaginationState.md
description: >-
  Experimental: the pagination state `<Paginate />` yields in paged mode,
  exposing the active page, its request, and `loadPage` for navigating to a page
  by URL.
---

&#x20;

# &#x20;PagedPaginationState\<RT = `unknown`, E = `unknown`>

```ts
interface PagedPaginationState<RT = unknown, E = unknown> extends SharedPaginationState<RT, E> {
  readonly activePage: 
  | Readonly<PageCache<RT, E>>
  | null;
  readonly activePageRequest: Future<RT> | null;
  loadPage: (url: string) => Promise<RT | null>;
  readonly totalPages: number;
  adoptPage(request: Future<RT>): Promise<RT | null>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:52](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/signals/pagination-state.ts#L52)

The paged (single-page view) surface of a [PaginationState](PaginationState.md): render
[activePageRequest](PaginationState.md#activepagerequest), navigate with
[loadPage](PaginationState.md#loadpage). This is what the `<Paginate />`
component yields in `'paged'` mode (the default).

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

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:34](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/signals/pagination-state.ts#L34)

See [PaginationState.adoptPage](PaginationState.md#adoptpage).

#### Parameters

##### request

`Future`<`RT`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

#### Inherited from

[`SharedPaginationState`](SharedPaginationState.md).[`adoptPage`](SharedPaginationState.md#adoptpage)

## Properties

### activePage

```ts
readonly activePage: 
  | Readonly<PageCache<RT, E>>
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:54](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/signals/pagination-state.ts#L54)

See [PaginationState.activePage](PaginationState.md#activepage).

***

### activePageRequest

```ts
readonly activePageRequest: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:56](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/signals/pagination-state.ts#L56)

See [PaginationState.activePageRequest](PaginationState.md#activepagerequest).

***

### loadPage

```ts
loadPage: (url: string) => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:58](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/signals/pagination-state.ts#L58)

See [PaginationState.loadPage](PaginationState.md#loadpage).

#### Parameters

##### url

`string`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### totalPages

```ts
readonly totalPages: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:32](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/signals/pagination-state.ts#L32)

See [PaginationState.totalPages](PaginationState.md#totalpages).

#### Inherited from

[`SharedPaginationState`](SharedPaginationState.md).[`totalPages`](SharedPaginationState.md#totalpages)
