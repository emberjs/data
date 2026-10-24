---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/utils/types/WithPartial.md
---

# &#x20;WithPartial\<T, K *extends* keyof `T`>

```ts
type WithPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

Defined in: [warp-drive-packages/core/src/types/utils.ts:10](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/utils.ts#L10)

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
