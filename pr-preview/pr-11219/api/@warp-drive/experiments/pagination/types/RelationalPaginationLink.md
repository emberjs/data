---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/experiments/pagination/types/RelationalPaginationLink.md
description: >-
  Experimental: a `first`, `prev`, `next`, or `last` link relative to the active
  page, with `setActive` to load it, and the only kind of link cursor-based
  pagination has.
---

&#x20;

# &#x20;RelationalPaginationLink&#x20;

```ts
interface RelationalPaginationLink {
  readonly isCurrent: boolean;
  readonly isReal: true;
  readonly rel: "first" | "prev" | "next" | "last";
  setActive: () => Promise<unknown>;
  readonly url: string;
  get text(): string;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:149](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L149)

**`Hideconstructor`**

A relational (`first`/`prev`/`next`/`last`) navigation link, relative to the
active page. Unlike [RealPaginationLink](RealPaginationLink.md) these carry no ordinal index —
they are the only links available for cursor-based pagination, where pages are
chained purely by opaque relational links with no page number or total. They
are also available in numbered pagination as a convenience.

```gts
<EachLink @pages={{pages}} as |state|>
  {{#if state.prev}}<button {{on "click" state.prev.setActive}}>Previous</button>{{/if}}
  {{#if state.next}}<button {{on "click" state.next.setActive}}>Next</button>{{/if}}
</EachLink>
```

## Properties

### isCurrent

```ts
readonly isCurrent: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:159](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L159)

Whether this link points at the page that is already active — for example
the `first` link while the first page is being viewed. Useful for
disabling the control.

***

### isReal

```ts
readonly isReal: true;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:150](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L150)

***

### rel

```ts
readonly rel: "first" | "prev" | "next" | "last";
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:152](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L152)

***

### setActive

```ts
setActive: () => Promise<unknown>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:188](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L188)

Loads this link's page and makes it the active page on the associated
[PaginationState](PaginationState.md). It is a stable reference, so it is safe to pass
around as an "action" or "event" handler:

```gts
<button {{on "click" link.setActive}}>{{link.text}}</button>
```

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

***

### url

```ts
readonly url: string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:153](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L153)

### text

#### Get Signature

```ts
get text(): string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:175](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L175)

##### Returns

`string`
