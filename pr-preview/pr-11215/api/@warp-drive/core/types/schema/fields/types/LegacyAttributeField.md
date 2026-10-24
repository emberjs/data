---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/schema/fields/types/LegacyAttributeField.md
description: >-
  Legacy field schema of kind `attribute` for a primitive value whose `type`
  names a legacy transform a serializer may apply; LegacyMode only.
---

# &#x20;LegacyAttributeField

```ts
interface LegacyAttributeField {
  kind: "attribute";
  name: string;
  options?: AttrOptions;
  sourceKey?: string;
  type?: string | null;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1372](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L1372)

> \[!CAUTION]
> This Field is LEGACY
> It cannot be used with PolarisMode

A generic "field" that can be used to define
primitive value fields.

If the field points to an object or array,
it will not be deep-tracked.

The [LegacyMode](/guides/the-manual/schemas/resources/legacy-mode#defining-legacy-schemas)
guide shows how to use it.

Transforms when defined are legacy transforms
that a serializer *might* use, but their usage
is not guaranteed.

## Properties

### kind

```ts
kind: "attribute";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1378](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L1378)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1385](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L1385)

The name of the field.

***

### options?

```ts
optional options?: AttrOptions;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1425](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L1425)

Options to pass to the transform, if any

Must comply to the specific transform's options
schema.

See [AttrOptions](AttrOptions.md) for more info.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1409](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L1409)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [LegacyAttributeField.name](#name)

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
optional type?: string | null;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1416](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L1416)

The name of the transform to use, if any
