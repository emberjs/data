---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/types/schema/concepts/types/Transformation.md
description: >-
  A registered pair of `serialize` and `hydrate` functions that convert a
  field's raw cached value to and from the value exposed on a record.
---

# &#x20;Transformation\<T *extends* [`Value`](../../../json/raw/types/Value.md) = [`Value`](../../../json/raw/types/Value.md), PT = `unknown`>

```ts
type Transformation<T extends Value = Value, PT = unknown> = {
  ___(unique) Symbol($type): string;
  defaultValue?: T;
  hydrate: PT;
  serialize: T;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:27](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/schema/concepts.ts#L27)

A Transformation converts a cached primitive value into a richer
"presentation" value exposed on a record, and back again.

Transformations are used by GenericField, ObjectField
and ArrayField to convert between the raw value stored in the
cache (`T`) and the value read from or written to a record (`PT`).

Transformations must be registered with the SchemaService via
`schema.registerTransformation(transform)` before use, keyed by the
name assigned to their [Type](../../../symbols/variables/Type.md) property.

## Type Parameters

### T

`T` *extends* [`Value`](../../../json/raw/types/Value.md) = [`Value`](../../../json/raw/types/Value.md)

### PT

`PT` = `unknown`

## Methods

### defaultValue()?

```ts
optional defaultValue(options: ObjectValue | null, identifier: ResourceKey): T;
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:44](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/schema/concepts.ts#L44)

Computes the value to use when no value is present in the cache
for the field.

#### Parameters

##### options

[`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null`

##### identifier

[`ResourceKey`](../../../identifier/types/ResourceKey.md)

#### Returns

`T`

***

### hydrate()

```ts
hydrate(
   value: T | undefined, 
   options: ObjectValue | null, 
   record: unknown
): PT;
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:38](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/schema/concepts.ts#L38)

Converts a value from its raw cached form into the presentation
form exposed on a record.

#### Parameters

##### value

`T` | `undefined`

##### options

[`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null`

##### record

`unknown`

#### Returns

`PT`

***

### serialize()

```ts
serialize(
   value: PT, 
   options: ObjectValue | null, 
   record: unknown
): T;
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:32](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/schema/concepts.ts#L32)

Converts a value from its presentation form (as read from or written
to a record) into the raw form to be stored in the cache.

#### Parameters

##### value

`PT`

##### options

[`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null`

##### record

`unknown`

#### Returns

`T`

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): string;
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:49](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/schema/concepts.ts#L49)

The unique name this transformation is registered under.
