---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/schema-dsl/functions/ObjectSchema.md
description: >-
  Class decorator that compiles a class into an object schema for embedded,
  identity-less data used as the value of `schemaObject` and `schemaArray`
  fields.
---

# &#x20;ObjectSchema()

```ts
function ObjectSchema(target: AnyConstructor): void;
function ObjectSchema(type: string, options?: ObjectSchemaOptions): (target: AnyConstructor) => void;
function ObjectSchema(options: ObjectSchemaOptions): (target: AnyConstructor) => void;
```

## Call Signature

```ts
function ObjectSchema(target: AnyConstructor): void;
```

Defined in: [entities/object-schema.ts:71](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/entities/object-schema.ts#L71)

**`Class Decorator`**

Marks a class as an [object schema](../../core/types/schema/fields/types/ObjectSchema.md) — an
embedded structure with no independent identity of its own, for use as
the value of a [schemaObject](schemaObject.md) or [schemaArray](schemaArray.md) field.

The object's `type` is derived from the class name (dasherized) unless a
`type` string is passed explicitly. Its `identity` is `null` unless a
property is decorated with [hash](hash.md), in which case that compiled
[HashField](../../core/types/schema/fields/types/HashField.md) becomes the identity.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order.

### Parameters

#### target

`AnyConstructor`

### Returns

`void`

### Example

::: code-group

```ts [address.ts]
import { ObjectSchema, field } from '@warp-drive/schema-dsl';

@ObjectSchema
export class Address {
  @field declare street: string;
  @field declare city: string;
}
```

```json [compiled schema]
{
  "type": "address",
  "identity": null,
  "fields": [
    { "kind": "field", "name": "street" },
    { "kind": "field", "name": "city" }
  ]
}
```

:::

## Call Signature

```ts
function ObjectSchema(type: string, options?: ObjectSchemaOptions): (target: AnyConstructor) => void;
```

Defined in: [entities/object-schema.ts:72](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/entities/object-schema.ts#L72)

**`Class Decorator`**

Marks a class as an [object schema](../../core/types/schema/fields/types/ObjectSchema.md) — an
embedded structure with no independent identity of its own, for use as
the value of a [schemaObject](schemaObject.md) or [schemaArray](schemaArray.md) field.

The object's `type` is derived from the class name (dasherized) unless a
`type` string is passed explicitly. Its `identity` is `null` unless a
property is decorated with [hash](hash.md), in which case that compiled
[HashField](../../core/types/schema/fields/types/HashField.md) becomes the identity.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order.

### Parameters

#### type

`string`

#### options?

[`ObjectSchemaOptions`](../types/ObjectSchemaOptions.md)

### Returns

(`target`: `AnyConstructor`) => `void`

### Example

::: code-group

```ts [address.ts]
import { ObjectSchema, field } from '@warp-drive/schema-dsl';

@ObjectSchema
export class Address {
  @field declare street: string;
  @field declare city: string;
}
```

```json [compiled schema]
{
  "type": "address",
  "identity": null,
  "fields": [
    { "kind": "field", "name": "street" },
    { "kind": "field", "name": "city" }
  ]
}
```

:::

## Call Signature

```ts
function ObjectSchema(options: ObjectSchemaOptions): (target: AnyConstructor) => void;
```

Defined in: [entities/object-schema.ts:73](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/entities/object-schema.ts#L73)

**`Class Decorator`**

Marks a class as an [object schema](../../core/types/schema/fields/types/ObjectSchema.md) — an
embedded structure with no independent identity of its own, for use as
the value of a [schemaObject](schemaObject.md) or [schemaArray](schemaArray.md) field.

The object's `type` is derived from the class name (dasherized) unless a
`type` string is passed explicitly. Its `identity` is `null` unless a
property is decorated with [hash](hash.md), in which case that compiled
[HashField](../../core/types/schema/fields/types/HashField.md) becomes the identity.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order.

### Parameters

#### options

[`ObjectSchemaOptions`](../types/ObjectSchemaOptions.md)

### Returns

(`target`: `AnyConstructor`) => `void`

### Example

::: code-group

```ts [address.ts]
import { ObjectSchema, field } from '@warp-drive/schema-dsl';

@ObjectSchema
export class Address {
  @field declare street: string;
  @field declare city: string;
}
```

```json [compiled schema]
{
  "type": "address",
  "identity": null,
  "fields": [
    { "kind": "field", "name": "street" },
    { "kind": "field", "name": "city" }
  ]
}
```

:::
