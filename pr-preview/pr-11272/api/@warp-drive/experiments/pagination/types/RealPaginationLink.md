---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/experiments/pagination/types/RealPaginationLink.md
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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:543](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L543)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:548](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L548)

***

### index

```ts
readonly index: number;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:546](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L546)

***

### isCurrent

```ts
readonly isCurrent: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:547](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L547)

***

### isReal

```ts
readonly isReal: true;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:544](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L544)

***

### setActive

```ts
setActive: () => Promise<unknown>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:560](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L560)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:545](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L545)

### text

#### Get Signature

```ts
get text(): string;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:550](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L550)

##### Returns

`string`
