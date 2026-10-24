---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/utilities/string/functions/uncountable.md
description: >-
  Registers a word that `pluralize` and `singularize` should always return
  unchanged.
---

# &#x20;uncountable()&#x20;

```ts
function uncountable(word: string): void;
```

Defined in: [-private/string/inflect.ts:32](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/utilities/src/-private/string/inflect.ts#L32)

Marks a word as uncountable. Uncountable words are not pluralized
or singularized.

## Parameters

### word

`string`

## Returns

`void`
