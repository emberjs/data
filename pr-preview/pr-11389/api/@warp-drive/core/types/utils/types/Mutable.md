---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/types/utils/types/Mutable.md
description: Utility type that strips `readonly` from every property of an object type.
---

# &#x20;Mutable\<T>

```ts
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
```

Defined in: [warp-drive-packages/core/src/types/utils.ts:29](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/utils.ts#L29)

Removes `readonly` from every property of `T`.

## Type Parameters

### T

`T`

## Example

```ts
interface Config { readonly host: string; }
type MutableConfig = Mutable<Config>; // { host: string }
```
