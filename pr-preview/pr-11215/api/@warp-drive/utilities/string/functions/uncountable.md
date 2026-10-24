---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/utilities/string/functions/uncountable.md
description: >-
  Registers a word that `pluralize` and `singularize` should always return
  unchanged.
---

# &#x20;uncountable()&#x20;

```ts
function uncountable(word: string): void;
```

Defined in: [-private/string/inflect.ts:32](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/utilities/src/-private/string/inflect.ts#L32)

Marks a word as uncountable. Uncountable words are not pluralized
or singularized.

## Parameters

### word

`string`

## Returns

`void`
