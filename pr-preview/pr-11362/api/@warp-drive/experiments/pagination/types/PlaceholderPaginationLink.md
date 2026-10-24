---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/experiments/pagination/types/PlaceholderPaginationLink.md
description: >-
  Experimental: a non-navigable gap marker in numbered pagination links,
  standing in for a range of not-yet-loaded pages, usually shown as an ellipsis.
---

&#x20;

# &#x20;PlaceholderPaginationLink&#x20;

```ts
interface PlaceholderPaginationLink {
  indexRange: [number, number];
  readonly isReal: false;
  text: string;
  get distanceFromActiveIndex(): number;
  get rangeSize(): number;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:88](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/pagination-links.ts#L88)

**`Hideconstructor`**

A stand-in for a run of pages that have not been loaded yet, rendered as an
ellipsis between numbered links. It covers an [indexRange](#indexrange) rather than a
single page and has no page to navigate to.

```gts
<EachLink @pages={{pages}} as |state|>
  {{#each state.links as |link|}}
    {{#unless link.isReal}}
      <span title="{{link.rangeSize}} more pages">{{link.text}}</span>
    {{/unless}}
  {{/each}}
</EachLink>
```

## Properties

### indexRange

```ts
indexRange: [number, number];
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:95](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/pagination-links.ts#L95)

The inclusive `[start, end]` page-number range of not-yet-loaded pages this
placeholder stands in for.

***

### isReal

```ts
readonly isReal: false;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:89](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/pagination-links.ts#L89)

***

### text

```ts
text: string;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:99](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/pagination-links.ts#L99)

### distanceFromActiveIndex

#### Get Signature

```ts
get distanceFromActiveIndex(): number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:115](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/pagination-links.ts#L115)

The distance between the active page and the nearest edge of this
placeholder's index range.

##### Returns

`number`

***

### rangeSize

#### Get Signature

```ts
get rangeSize(): number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:107](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/pagination-links.ts#L107)

The number of pages this placeholder covers.

##### Returns

`number`
