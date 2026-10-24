---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/record/types/TypeFromInstanceOrString.md
description: >-
  Type utility giving a record type's `[Type]` resource type string, or `string`
  if it declares none.
---

# &#x20;TypeFromInstanceOrString\<T>

```ts
type TypeFromInstanceOrString<T> = T extends TypedRecordInstance ? T[typeof Type] : string;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:55](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/record.ts#L55)

A type utility that extracts the Type if available,
otherwise it returns string

## Type Parameters

### T

`T`
