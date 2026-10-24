---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/utilities/string/functions/irregular.md
description: >-
  Registers a singular and plural word pair that `pluralize` and `singularize`
  map directly instead of applying rules.
---

# &#x20;irregular()&#x20;

```ts
function irregular(single: string, plur: string): void;
```

Defined in: [-private/string/inflect.ts:59](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/utilities/src/-private/string/inflect.ts#L59)

Marks a word as irregular. Irregular words have unique
pluralization and singularization rules.

## Parameters

### single

`string`

### plur

`string`

## Returns

`void`
