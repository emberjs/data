---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/schema/fields/functions/resourceSchema.md
description: >-
  Returns the given resource schema unchanged, typed so its definition is
  type-checked; relationship inverses and related types are not validated.
---

# &#x20;resourceSchema()

```ts
function resourceSchema<T extends 
  | PolarisResourceSchema
  | LegacyResourceSchema>(schema: 
  | PolarisResourceSchema
  | LegacyResourceSchema): T;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2684](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/schema/fields.ts#L2684)

A no-op type utility that enables type-checking resource schema
definitions.

Will return the passed in schema.

This will not validate relationship inverses or related types,
as doing so would require a full schema graph to be passed in
and no cycles in the graph to be present.

## Type Parameters

### T

`T` *extends*
| [`PolarisResourceSchema`](../types/PolarisResourceSchema.md)
| [`LegacyResourceSchema`](../types/LegacyResourceSchema.md)

## Parameters

### schema

| [`PolarisResourceSchema`](../types/PolarisResourceSchema.md)
| [`LegacyResourceSchema`](../types/LegacyResourceSchema.md)

## Returns

`T`
