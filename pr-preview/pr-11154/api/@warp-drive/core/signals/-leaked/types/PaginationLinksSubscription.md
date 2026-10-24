---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/PaginationLinksSubscription.md
---

# &#x20;PaginationLinksSubscription\<RT, E>&#x20;

```ts
interface PaginationLinksSubscription<RT, E> {
  get paginationLinks(): Readonly<PaginationLinks<RT, E>>;
  (symbol) dispose(): void;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links-subscription.ts:8](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links-subscription.ts#L8)

**`Hideconstructor`**

The framework-agnostic core of a pagination links component (for example the
`<EachLink />` component of `@warp-drive/ember`): it owns the component
lifecycle, while the links themselves live on the [PaginationLinks](PaginationLinks.md)
it exposes.

Given the [PagedPaginationState](PagedPaginationState.md) a `<Paginate />` component is driving,
[paginationLinks](#paginationlinks) derives that state's `PaginationLinks` — the numbered
links (with placeholders for gaps) and the relational
`first`/`prev`/`next`/`last` links a component yields for the consumer to
render. All of them read from the same shared page graph as the
`<Paginate />` component, so they stay in sync as pages load and the active
page changes.

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

Defined in: [warp-drive-packages/core/src/signals/pagination-links-subscription.ts:13](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links-subscription.ts#L13)

The method to call when the component this subscription is attached to
unmounts.

#### Returns

`void`

## Properties

### paginationLinks

#### Get Signature

```ts
get paginationLinks(): Readonly<PaginationLinks<RT, E>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links-subscription.ts:62](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links-subscription.ts#L62)

The [PaginationLinks](PaginationLinks.md) derived from the [PagedPaginationState](PagedPaginationState.md)
passed as an arg — the surface a links component yields to its consumer:
the numbered [links](PaginationLinks.md#links) (empty for cursor-based
collections) and the relational [first](PaginationLinks.md#first)/
[prev](PaginationLinks.md#prev)/[next](PaginationLinks.md#next)/
[last](PaginationLinks.md#last) links.

Recomputes when the `pages` arg changes, so a component whose pagination
resets to a different collection derives fresh links automatically.

##### Returns

[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<[`PaginationLinks`](PaginationLinks.md)<`RT`, `E`>>
