---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/RelationalPaginationLink.md
---

# &#x20;RelationalPaginationLink&#x20;

```ts
interface RelationalPaginationLink {
  readonly isCurrent: boolean;
  readonly isReal: true;
  readonly rel: "next" | "first" | "last" | "prev";
  readonly url: string;
  get text(): string;
  setActive(): Promise<unknown>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:143](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L143)

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

## Methods

### setActive()

```ts
setActive(): Promise<unknown>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:182](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L182)

Loads this link's page and makes it the active page on the associated
[PaginationState](PaginationState.md). It is a stable reference, so it is safe to pass
around as an "action" or "event" handler:

```gts
<button {{on "click" link.setActive}}>{{link.text}}</button>
```

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

## Properties

### isCurrent

```ts
readonly isCurrent: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:153](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L153)

Whether this link points at the page that is already active — for example
the `first` link while the first page is being viewed. Useful for
disabling the control.

***

### isReal

```ts
readonly isReal: true;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:144](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L144)

***

### rel

```ts
readonly rel: "next" | "first" | "last" | "prev";
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:146](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L146)

***

### url

```ts
readonly url: string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:147](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L147)

### text

#### Get Signature

```ts
get text(): string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:169](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L169)

##### Returns

`string`
