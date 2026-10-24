---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/schema/fields/types/LegacyAliasField.md
---

# &#x20;LegacyAliasField

```ts
interface LegacyAliasField {
  kind: "alias";
  name: string;
  options: 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField;
  type: null;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:119](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L119)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:125](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L125)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:132](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L132)

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
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:146](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L146)

The field def for which this is an alias.

***

### type

```ts
type: null;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:139](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L139)

Always null (for now)
