---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/core/types/schema/fields/types/LegacyAliasField.md
description: >-
  Field schema of kind `alias` for LegacyMode resources that exposes another
  field's cache value, including legacy attributes and relationships, under a
  new name.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:138](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/schema/fields.ts#L138)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:144](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/schema/fields.ts#L144)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:151](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/schema/fields.ts#L151)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:165](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/schema/fields.ts#L165)

The field def for which this is an alias.

***

### type

```ts
type: null;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:158](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/schema/fields.ts#L158)

Always null (for now)
