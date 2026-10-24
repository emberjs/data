---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/PlaceholderPaginationLink.md
---

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

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:84](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L84)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:91](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L91)

The inclusive `[start, end]` page-number range of not-yet-loaded pages this
placeholder stands in for.

***

### isReal

```ts
readonly isReal: false;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:85](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L85)

***

### text

```ts
text: string = '.';
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:95](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L95)

### distanceFromActiveIndex

#### Get Signature

```ts
get distanceFromActiveIndex(): number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:111](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L111)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:103](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links.ts#L103)

The number of pages this placeholder covers.

##### Returns

`number`
