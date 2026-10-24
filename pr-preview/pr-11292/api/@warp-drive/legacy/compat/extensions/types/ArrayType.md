---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/compat/extensions/types/ArrayType.md
---

&#x20;

# &#x20;ArrayType\<T>

```ts
type ArrayType<T> = T extends ReadonlyArray<infer U> ? U : never;
```

Defined in: [warp-drive-packages/legacy/src/compat/extensions.ts:376](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/compat/extensions.ts#L376)

Extracts the element type of an array type, or `never` if `T` is not an array.

## Type Parameters

### T

`T`
