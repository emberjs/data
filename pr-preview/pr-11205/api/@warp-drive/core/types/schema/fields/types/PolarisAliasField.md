---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/schema/fields/types/PolarisAliasField.md
---

# &#x20;PolarisAliasField

```ts
interface PolarisAliasField {
  kind: "alias";
  name: string;
  options: 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
  type: null;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:187](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L187)

A field that can be used to alias one key to another
key present in the cache version of the resource.

Unlike DerivedField, an AliasField may write to its
source when a record is in an editable mode.

\~~AliasFields may utilize a transform, specified by type,
to pre/post process the raw data for the field.~~ (not yet implemented)

An AliasField may also specify a `kind` via options.
`kind` may be any other valid field kind other than

* `@hash`
* `@id`
* `@local`
* `derived`

This allows an AliasField to rename any field in the cache.

Alias fields are generally intended to be used to support migrating
between different schemas, though there are times where they are useful
as a form of advanced derivation when used with a transform. For instance,
an AliasField could be used to expose both a string and a Date version of the
same field, with both being capable of being written to.

## Properties

### kind

```ts
kind: "alias";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:193](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L193)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:200](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L200)

The name of the field.

***

### options

```ts
options: 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:214](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L214)

The field def for which this is an alias.

***

### type

```ts
type: null;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:207](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L207)

Always null (for now)
