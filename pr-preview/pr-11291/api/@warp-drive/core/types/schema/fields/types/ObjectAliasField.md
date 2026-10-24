---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/core/types/schema/fields/types/ObjectAliasField.md
description: >-
  Field schema of kind `alias` for object schemas that exposes another
  non-relationship field's cache value under a new name.
---

# &#x20;ObjectAliasField

```ts
interface ObjectAliasField {
  kind: "alias";
  name: string;
  options: 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField;
  type: null;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:277](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/schema/fields.ts#L277)

A field that can be used to alias one key to another
key present in the cache version of the resource.

Unlike DerivedField, an AliasField may write to its
source when a record is in an editable mode.

AliasFields may utilize a transform, specified by type,
to pre/post process the field.

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:283](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/schema/fields.ts#L283)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:290](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/schema/fields.ts#L290)

The name of the field.

***

### options

```ts
options: 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:304](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/schema/fields.ts#L304)

The field def for which this is an alias.

***

### type

```ts
type: null;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:297](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/schema/fields.ts#L297)

Always null (for now)
