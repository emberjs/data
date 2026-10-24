---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/utilities/functions/filterEmpty.md
description: >-
  Returns a copy of an object without keys whose values are `undefined`, `null`,
  empty strings, or empty arrays.
---

# &#x20;filterEmpty()

```ts
function filterEmpty(source: Record<string, Serializable>): Record<string, Serializable>;
```

Defined in: [index.ts:657](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/utilities/src/index.ts#L657)

filter out keys of an object that have falsy values or point to empty arrays
returning a new object with only those keys that have truthy values / non-empty arrays

See [Cache Keys for Requests](/guides/the-manual/requests/builders#cache-keys-for-requests) for
why builders need stable query params.

## Parameters

### source

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, [`Serializable`](../../core/types/params/types/Serializable.md)>

object to filter keys with empty values from

## Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, [`Serializable`](../../core/types/params/types/Serializable.md)>

A new object with the keys that contained empty values removed
