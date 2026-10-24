---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/utilities/string/functions/uncountable.md
description: >-
  Registers a word that `pluralize` and `singularize` should always return
  unchanged.
---

# &#x20;uncountable()&#x20;

```ts
function uncountable(word: string): void;
```

Defined in: [-private/string/inflect.ts:32](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/utilities/src/-private/string/inflect.ts#L32)

Marks a word as uncountable. Uncountable words are not pluralized
or singularized.

## Parameters

### word

`string`

## Returns

`void`
