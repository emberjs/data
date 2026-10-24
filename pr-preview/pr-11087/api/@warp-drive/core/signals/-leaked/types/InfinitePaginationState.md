---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/signals/-leaked/types/InfinitePaginationState.md
---

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

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:58](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L58)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:28](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L28)

See [PaginationState.adoptPage](PaginationState.md#adoptpage).

#### Parameters

##### request

[`Future`](../../../request/types/Future.md)<`RT`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

#### Inherited from

[`SharedPaginationState`](SharedPaginationState.md).[`adoptPage`](SharedPaginationState.md#adoptpage)

## Properties

### data

```ts
readonly data: Iterable<ContentItem<RT>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:60](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L60)

See [PaginationState.data](PaginationState.md#data).

***

### hasNext

```ts
readonly hasNext: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:64](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L64)

See [PaginationState.hasNext](PaginationState.md#hasnext).

***

### hasPrevious

```ts
readonly hasPrevious: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:66](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L66)

See [PaginationState.hasPrevious](PaginationState.md#hasprevious).

***

### loadNext

```ts
loadNext: () => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:72](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L72)

See [PaginationState.loadNext](PaginationState.md#loadnext).

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### loadPrev

```ts
loadPrev: () => Promise<RT | null>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:74](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L74)

See [PaginationState.loadPrev](PaginationState.md#loadprev).

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

***

### nextRequest

```ts
readonly nextRequest: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:68](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L68)

See [PaginationState.nextRequest](PaginationState.md#nextrequest).

***

### pages

```ts
readonly pages: Iterable<Readonly<PageCache<RT, E>>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:62](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L62)

See [PaginationState.pages](PaginationState.md#pages).

***

### previousRequest

```ts
readonly previousRequest: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:70](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L70)

See [PaginationState.previousRequest](PaginationState.md#previousrequest).

***

### totalPages

```ts
readonly totalPages: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:26](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L26)

See [PaginationState.totalPages](PaginationState.md#totalpages).

#### Inherited from

[`SharedPaginationState`](SharedPaginationState.md).[`totalPages`](SharedPaginationState.md#totalpages)
