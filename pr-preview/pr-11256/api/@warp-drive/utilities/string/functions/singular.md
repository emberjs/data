---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/utilities/string/functions/singular.md
description: >-
  Adds a regex and replacement rule that `singularize` checks before all
  existing singular rules.
---

# &#x20;singular()&#x20;

```ts
function singular(regex: RegExp, string: string): void;
```

Defined in: [-private/string/inflect.ts:194](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/utilities/src/-private/string/inflect.ts#L194)

Adds a singularization rule.

## Parameters

### regex

[`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### string

`string`

## Returns

`void`
