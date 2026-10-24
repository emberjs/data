---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/experiments/pagination/types/PaginationLinks.md
---

&#x20;

# &#x20;PaginationLinks\<RT = `unknown`, E = `unknown`>&#x20;

```ts
interface PaginationLinks<RT = unknown, E = unknown> {
  get first(): RelationalPaginationLink | null;
  get last(): RelationalPaginationLink | null;
  get links(): PaginationLink[];
  get next(): RelationalPaginationLink | null;
  get prev(): RelationalPaginationLink | null;
}
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:687](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L687)

**`Hideconstructor`**

The reactive set of navigation links derived from a [PaginationState](PaginationState.md).
Where `PaginationState` tracks which pages are loaded and which one is active,
`PaginationLinks` turns that page graph into the links a UI renders to move
between pages.

It provides two kinds of link:

* [links](#links): the numbered links, with [PlaceholderPaginationLink](PlaceholderPaginationLink.md)
  placeholders standing in for gaps of not-yet-loaded pages. Only numbered
  collections (where the server exposes page numbers) produce these.
* [prev](#prev) and [next](#next): the relational links for the active page.
  Available in both numbered and cursor-based pagination, and the only links a
  cursor-based collection has.
* [first](#first) and [last](#last): the relational links to the collection's
  edges, when the response exposes them. Usually present on every page —
  including the edge page itself, where the link's
  [isCurrent](RelationalPaginationLink.md#iscurrent) is `true`.

Every link updates as pages load and as the active page changes, since they
read straight from the state's shared page graph. To get the links for a
state, use [getPaginationLinks](../functions/getPaginationLinks.md).

See also:

* [RealPaginationLink](RealPaginationLink.md)
* [PlaceholderPaginationLink](PlaceholderPaginationLink.md)
* [RelationalPaginationLink](RelationalPaginationLink.md)

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

## Properties

### first

#### Get Signature

```ts
get first(): RelationalPaginationLink | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:696](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L696)

The relational `first` link of the collection, or `null` when the active
page's response did not expose one. Unlike [prev](#prev)/[next](#next) it is
usually present on every page — including the first page itself, where the
link's [isCurrent](RelationalPaginationLink.md#iscurrent) is `true`
(useful for disabling the control).

##### Returns

[`RelationalPaginationLink`](RelationalPaginationLink.md) | `null`

***

### last

#### Get Signature

```ts
get last(): RelationalPaginationLink | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:712](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L712)

The relational `last` link of the collection, or `null` when the active
page's response did not expose one. Mirror of [first](#first) for the end of
the collection.

##### Returns

[`RelationalPaginationLink`](RelationalPaginationLink.md) | `null`

***

### links

#### Get Signature

```ts
get links(): PaginationLink[];
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:720](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L720)

The numbered links and placeholders, derived from the shared page graph.

Only produced for numbered pagination (where the server exposes page numbers).
Cursor-based collections have no page numbers, so this is empty — use
[prev](#prev)/[next](#next) for cursor navigation.

##### Returns

[`PaginationLink`](PaginationLink.md)\[]

***

### next

#### Get Signature

```ts
get next(): RelationalPaginationLink | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:706](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L706)

The relational `next` link for the active page, or `null` at the end of the
collection. Available in both numbered and cursor pagination.

##### Returns

[`RelationalPaginationLink`](RelationalPaginationLink.md) | `null`

***

### prev

#### Get Signature

```ts
get prev(): RelationalPaginationLink | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:701](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L701)

The relational `prev` link for the active page, or `null` at the start of the
collection. Available in both numbered and cursor pagination.

##### Returns

[`RelationalPaginationLink`](RelationalPaginationLink.md) | `null`
