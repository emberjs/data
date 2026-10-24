---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl/types/SchemaArrayOptions.md
---

# &#x20;SchemaArrayOptions

```ts
interface SchemaArrayOptions {
  defaultValue?: boolean;
  key?: string;
  polymorphic?: boolean;
  sourceKey?: string;
  type?: string | null;
  typeField?: string;
}
```

Defined in: [fields/schema-array.ts:11](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L11)

Options accepted by the [schemaArray](../functions/schemaArray.md) decorator.

## Properties

### defaultValue?

```ts
optional defaultValue?: boolean;
```

Defined in: [fields/schema-array.ts:88](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L88)

If true, a missing cache value becomes `[]` instead of `null`.
Compiles onto the [SchemaArrayField](../../core/types/schema/fields/types/SchemaArrayField.md)'s `options.defaultValue`.

***

### key?

```ts
optional key?: string;
```

Defined in: [fields/schema-array.ts:80](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L80)

How the array decides that a cache object is the same schema-object
it already instantiated. Compiles onto the
[SchemaArrayField](../../core/types/schema/fields/types/SchemaArrayField.md)'s `options.key`. Runtime defaults to
`'@identity'`.

* `'@identity'` — referential identity of the cached object
* `'@index'` — the element's index in the array
* `'@hash'` — the `@hash` function on the contained object schema
* a field name — a `kind: 'field'` on the contained object schema

***

### polymorphic?

```ts
optional polymorphic?: boolean;
```

Defined in: [fields/schema-array.ts:50](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L50)

Whether each element may be a different object-schema type.
Compiles onto the [SchemaArrayField](../../core/types/schema/fields/types/SchemaArrayField.md)'s `options.polymorphic`.

This is not resource-relationship polymorphism: there is no inverse,
no `async`, and no `as` trait. Runtime picks each element's object
schema by reading [typeField](#typefield)
from the raw value, or by running the hash function named by `type`
when `typeField` is `'@hash'`.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/schema-array.ts:36](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L36)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the
[SchemaArrayField](../../core/types/schema/fields/types/SchemaArrayField.md)'s `sourceKey`.

***

### type?

```ts
optional type?: string | null;
```

Defined in: [fields/schema-array.ts:27](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L27)

If the field is not polymorphic, the `type` of the [ObjectSchema](../functions/ObjectSchema.md)
that describes each element.

If the field is polymorphic and [typeField](#typefield)
is `'@hash'`, the name of the [HashFn](../../core/types/schema/concepts/types/HashFn.md) used to compute each
element's type from the raw cache value.

If the field is polymorphic and `typeField` is a payload key, this may
be omitted (compiles to `null`). Runtime reads the type from that key.

Compiles onto the [SchemaArrayField](../../core/types/schema/fields/types/SchemaArrayField.md)'s `type`.

***

### typeField?

```ts
optional typeField?: string;
```

Defined in: [fields/schema-array.ts:65](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L65)

When `polymorphic` is true, the key on each raw element that holds
the object-schema type, or `'@hash'` to compute it.

Compiles onto the [SchemaArrayField](../../core/types/schema/fields/types/SchemaArrayField.md)'s `options.type`.
Runtime defaults to `'type'` when this is omitted.

Named `typeField` on the decorator so it does not collide with
[type](#type) (the object-schema or hash
function name).
