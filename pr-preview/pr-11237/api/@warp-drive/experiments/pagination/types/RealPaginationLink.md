---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/experiments/pagination/types/RealPaginationLink.md
description: >-
  Experimental: a numbered page link with its page number, whether it is
  current, its distance from the active page, and `setActive` to load and show
  that page.
---

&#x20;

# &#x20;RealPaginationLink&#x20;

```ts
interface RealPaginationLink {
  readonly distanceFromActiveIndex: number;
  readonly index: number;
  readonly isCurrent: boolean;
  readonly isReal: true;
  setActive: () => Promise<unknown>;
  readonly url: string;
  get text(): string;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:31](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L31)

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

## Properties

### distanceFromActiveIndex

```ts
readonly distanceFromActiveIndex: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:37](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L37)

***

### index

```ts
readonly index: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:35](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L35)

***

### isCurrent

```ts
readonly isCurrent: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:36](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L36)

***

### isReal

```ts
readonly isReal: true;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:32](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L32)

***

### setActive

```ts
setActive: () => Promise<unknown>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:62](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L62)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:34](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L34)

### text

#### Get Signature

```ts
get text(): string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:49](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links.ts#L49)

##### Returns

`string`
