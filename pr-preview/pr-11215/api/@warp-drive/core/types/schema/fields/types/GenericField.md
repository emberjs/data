---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/schema/fields/types/GenericField.md
description: >-
  Field schema of kind `field` for a primitive value, optionally converted by a
  registered `Transformation`; objects and arrays in it are not deep-tracked.
---

# &#x20;GenericField

```ts
interface GenericField {
  kind: "field";
  name: string;
  options?: ObjectValue;
  sourceKey?: string;
  type?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:51](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L51)

A generic "field" that can be used to define
primitive value fields.

The [SimpleFields](/guides/the-manual/schemas/simple-fields) guide shows how to
define them.

Replaces "attribute" for primitive value fields.
Can also be used to eject from deep-tracking of
objects or arrays.

A major difference between "field" and "attribute"
is that "type" points to a legacy transform on
"attribute" that a serializer *might* use, while
"type" points to a new-style transform on "field"
that a record implmentation *must* use.

## Properties

### kind

```ts
kind: "field";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:57](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L57)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:64](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L64)

The name of the field.

***

### options?

```ts
optional options?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:105](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L105)

Options to pass to the transform, if any

Must comply to the specific transform's options
schema.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:88](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L88)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [GenericField.name](#name)

For instance, if the API returns:

```ts
{
  attributes: {
    'first-name': 'Chris'
  }
}
```

But the app desires to use `record.firstName; // 'Chris'`

Then `name` would be set to `'firstName'` and
`sourceKey` would be set to `'first-name'`.

This option is only needed when the value differs from name.

***

### type?

```ts
optional type?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:95](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L95)

the name of the Transformation to use, if any
