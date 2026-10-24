---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/schema-dsl/types/SchemaObjectOptions.md
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

Defined in: [fields/schema-object.ts:11](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L11)

Options accepted by the [schemaObject](../functions/schemaObject.md) decorator.

## Properties

### defaultValue?

```ts
optional defaultValue?: boolean;
```

Defined in: [fields/schema-object.ts:74](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L74)

If true, a missing cache value becomes `{}` instead of `null`.
Ignored when `polymorphic` is true. Compiles onto the
[SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `options.defaultValue`.

***

### polymorphic?

```ts
optional polymorphic?: boolean;
```

Defined in: [fields/schema-object.ts:50](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L50)

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

Defined in: [fields/schema-object.ts:36](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L36)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the
[SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `sourceKey`.

***

### type?

```ts
optional type?: string | null;
```

Defined in: [fields/schema-object.ts:27](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L27)

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

Defined in: [fields/schema-object.ts:65](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L65)

When `polymorphic` is true, the key on the raw cache value that
holds the object-schema type, or `'@hash'` to compute it.

Compiles onto the [SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md)'s `options.type`.
Runtime defaults to `'type'` when this is omitted.

Named `typeField` on the decorator so it does not collide with
[type](#type) (the object-schema or hash
function name).
