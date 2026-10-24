---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/schema/fields/types/LegacyAttributeField.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1258](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L1258)

> \[!CAUTION]
> This Field is LEGACY
> It cannot be used with PolarisMode

A generic "field" that can be used to define
primitive value fields.

If the field points to an object or array,
it will not be deep-tracked.

Transforms when defined are legacy transforms
that a serializer *might* use, but their usage
is not guaranteed.

## Properties

### kind

```ts
kind: "attribute";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1264](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L1264)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1271](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L1271)

The name of the field.

***

### options?

```ts
optional options?: AttrOptions;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1311](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L1311)

Options to pass to the transform, if any

Must comply to the specific transform's options
schema.

See [AttrOptions](AttrOptions.md) for more info.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1295](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L1295)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1302](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L1302)

The name of the transform to use, if any
