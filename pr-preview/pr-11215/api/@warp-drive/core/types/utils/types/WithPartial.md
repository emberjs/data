---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/utils/types/WithPartial.md
description: Utility type that makes only the named properties of an object type optional.
---

# &#x20;WithPartial\<T, K *extends* keyof `T`>

```ts
type WithPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

Defined in: [warp-drive-packages/core/src/types/utils.ts:17](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/utils.ts#L17)

Makes the properties named in `K` optional on `T`, leaving the rest as-is.

## Type Parameters

### T

`T`

### K

`K` *extends* keyof `T`

## Example

```ts
interface User { id: string; name: string; }
type PartialName = WithPartial<User, 'name'>; // { id: string; name?: string }
```
