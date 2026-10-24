---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/schema/concepts/types/HashFn.md
---

# &#x20;HashFn\<T *extends* `object` = `object`>

```ts
type HashFn<T extends object = object> = {
  ___(unique) Symbol($type): string;
} & (data: T, options: ObjectValue | null, prop: string | null) => string;
```

Defined in: [warp-drive-packages/core/src/types/schema/concepts.ts:74](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/concepts.ts#L74)

A HashFn computes a stable string identity for an object from its
cache data, without access to a record instance.

HashFns back HashField, and are used to compute the `@hash`
identity of a schema-object, or to determine the resource type of a
polymorphic schema-object or schema-array member.

HashFns must be registered with the SchemaService via
`schema.registerHashFn(hashFn)` before use, keyed by the name
assigned to their [Type](../../../symbols/variables/Type.md) property.

## Type Declaration

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): string;
```

The unique name this hash function is registered under.

## Type Parameters

### T

`T` *extends* `object` = `object`
