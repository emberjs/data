---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/core/types/record/types/TypeFromInstance.md
description: >-
  Type utility giving a record type's `[Type]` resource type string, or `never`
  if it declares none.
---

# &#x20;TypeFromInstance\<T>

```ts
type TypeFromInstance<T> = T extends TypedRecordInstance ? T[typeof Type] : never;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:47](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/record.ts#L47)

A type utility that extracts the Type if available,
otherwise it returns never.

## Type Parameters

### T

`T`
