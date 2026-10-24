---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/utilities/string/functions/setMaxLRUCacheSize.md
description: >-
  Sets how many results the `camelize`, `underscore`, `capitalize`, and
  `dasherize` caches each keep (default 10,000).
---

# &#x20;setMaxLRUCacheSize()&#x20;

```ts
function setMaxLRUCacheSize(size: number): void;
```

Defined in: [-private/string/transform.ts:117](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/utilities/src/-private/string/transform.ts#L117)

Sets the maximum size of the LRUCache for all string transformation functions.
The default size is 10,000.

## Parameters

### size

`number`

## Returns

`void`
