---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/record/types/TypeFromInstanceOrString.md
description: >-
  Type utility giving a record type's `[Type]` resource type string, or `string`
  if it declares none.
---

# &#x20;TypeFromInstanceOrString\<T>

```ts
type TypeFromInstanceOrString<T> = T extends TypedRecordInstance ? T[typeof Type] : string;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:55](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/record.ts#L55)

A type utility that extracts the Type if available,
otherwise it returns string

## Type Parameters

### T

`T`
