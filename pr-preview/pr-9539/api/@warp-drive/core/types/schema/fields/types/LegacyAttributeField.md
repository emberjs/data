---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/schema/fields/types/LegacyAttributeField.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1326](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L1326)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1332](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L1332)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1339](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L1339)

The name of the field.

***

### options?

```ts
optional options?: AttrOptions;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1379](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L1379)

Options to pass to the transform, if any

Must comply to the specific transform's options
schema.

See [AttrOptions](AttrOptions.md) for more info.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1363](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L1363)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1370](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L1370)

The name of the transform to use, if any
