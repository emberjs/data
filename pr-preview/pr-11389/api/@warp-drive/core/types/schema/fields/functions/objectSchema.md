---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/types/schema/fields/functions/objectSchema.md
description: >-
  Returns the given object schema unchanged, typed so its definition is
  type-checked.
---

# &#x20;objectSchema()

```ts
function objectSchema<T extends ObjectSchema>(schema: T): T;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2653](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/schema/fields.ts#L2653)

A no-op type utility that enables type-checking object schema
definitions.

Will return the passed in schema.

## Type Parameters

### T

`T` *extends* [`ObjectSchema`](../types/ObjectSchema.md)

## Parameters

### schema

`T`

## Returns

`T`
