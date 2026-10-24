---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/RealPaginationLink.md
---

# &#x20;RealPaginationLink&#x20;

```ts
interface RealPaginationLink {
  readonly distanceFromActiveIndex: number;
  readonly index: number;
  readonly isCurrent: boolean;
  readonly isReal: true;
  readonly url: string;
  get text(): string;
  setActive(): Promise<unknown>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:29](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L29)

**`Hideconstructor`**

A single numbered link, e.g. page `3`. Loads its page and makes it active when
[setActive](#setactive) runs. Carries its [index](#index) and its
[distanceFromActiveIndex](#distancefromactiveindex) so a UI can style links by how far they sit
from the current page.

```gts
<EachLink @pages={{pages}} as |state|>
  {{#each state.links as |link|}}
    {{#if link.isReal}}
      <button class={{if link.isCurrent "active"}} {{on "click" link.setActive}}>
        {{link.text}}
      </button>
    {{/if}}
  {{/each}}
</EachLink>
```

## Methods

### setActive()

```ts
setActive(): Promise<unknown>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:60](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L60)

Loads this link's page and makes it the active page on the associated
[PaginationState](PaginationState.md). It is a stable reference, so it is safe to pass
around as an "action" or "event" handler:

```gts
<button {{on "click" link.setActive}}>{{link.text}}</button>
```

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

## Properties

### distanceFromActiveIndex

```ts
readonly distanceFromActiveIndex: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:35](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L35)

***

### index

```ts
readonly index: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:33](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L33)

***

### isCurrent

```ts
readonly isCurrent: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:34](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L34)

***

### isReal

```ts
readonly isReal: true;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:30](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L30)

***

### url

```ts
readonly url: string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:32](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L32)

### text

#### Get Signature

```ts
get text(): string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:47](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L47)

##### Returns

`string`
