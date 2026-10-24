---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/schema-dsl/types/SchemaObjectOptions.md
description: >-
  Options for the `@schemaObject` decorator that choose the embedded object
  schema, polymorphic type resolution, and default value.
---

# &#x20;SchemaObjectOptions

```ts
interface SchemaObjectOptions {
  defaultValue?: boolean;
  polymorphic?: boolean;
  sourceKey?: string;
  type?: string | null;
  typeField?: string;
}
```

Defined in: [fields/schema-object.ts:13](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L13)

Options accepted by the [schemaObject](../functions/schemaObject.md) decorator.

## Properties

### defaultValue?

```ts
optional defaultValue?: boolean;
```

Defined in: [fields/schema-object.ts:76](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L76)

If true, a missing cache value becomes `{}` instead of `null`.
Ignored when `polymorphic` is true. Compiles onto the
[SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `options.defaultValue`.

***

### polymorphic?

```ts
optional polymorphic?: boolean;
```

Defined in: [fields/schema-object.ts:52](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L52)

Whether this field may contain more than one object-schema type.
Compiles onto the [SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `options.polymorphic`.

This is not resource-relationship polymorphism: there is no inverse,
no `async`, and no `as` trait. Runtime picks the object schema by
reading [typeField](#typefield) from the
raw cache value, or by running the hash function named by `type`
when `typeField` is `'@hash'`.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/schema-object.ts:38](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L38)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the
[SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `sourceKey`.

***

### type?

```ts
optional type?: string | null;
```

Defined in: [fields/schema-object.ts:29](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L29)

If the field is not polymorphic, the `type` of the [ObjectSchema](../functions/ObjectSchema.md)
that describes the embedded object.

If the field is polymorphic and [typeField](#typefield)
is `'@hash'`, the name of the [HashFn](../../core/types/schema/concepts/types/HashFn.md) used to compute the object
type from the raw cache value.

If the field is polymorphic and `typeField` is a payload key, this may
be omitted (compiles to `null`). Runtime reads the type from that key.

Compiles onto the [SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `type`.

***

### typeField?

```ts
optional typeField?: string;
```

Defined in: [fields/schema-object.ts:67](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L67)

When `polymorphic` is true, the key on the raw cache value that
holds the object-schema type, or `'@hash'` to compute it.

Compiles onto the [SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `options.type`.
Runtime defaults to `'type'` when this is omitted.

Named `typeField` on the decorator so it does not collide with
[type](#type) (the object-schema or hash
function name).
