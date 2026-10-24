---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/experiments/pagination/types/PaginationLinksSubscription.md
---

&#x20;

# &#x20;PaginationLinksSubscription\<RT, E>&#x20;

```ts
interface PaginationLinksSubscription<RT, E> {
  get paginationLinks(): Readonly<PaginationLinks<RT, E>>;
  (symbol) dispose(): void;
}
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:941](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L941)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:946](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L946)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:982](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L982)

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
