---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/legacy/compat/extensions/types/ArrayType.md
description: >-
  Type utility resolving to the element type of an array type, or `never` for
  non-arrays.
---

&#x20;

# &#x20;ArrayType\<T>

```ts
type ArrayType<T> = T extends ReadonlyArray<infer U> ? U : never;
```

Defined in: [warp-drive-packages/legacy/src/compat/extensions.ts:393](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/legacy/src/compat/extensions.ts#L393)

Extracts the element type of an array type, or `never` if `T` is not an array.

## Type Parameters

### T

`T`
