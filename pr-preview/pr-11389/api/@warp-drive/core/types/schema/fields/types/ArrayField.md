---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/types/schema/fields/types/ArrayField.md
description: >-
  Field schema of kind `array` for an array of primitive values, each optionally
  passed through a registered transformation.
---

# &#x20;ArrayField

```ts
interface ArrayField {
  kind: "array";
  name: string;
  options?: { [key: string]: Value | undefined; arrayExtensions?: string[] };
  sourceKey?: string;
  type?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:728](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/schema/fields.ts#L728)

Represents a field whose value is an array
of primitive values.

If the array's elements are not primitive
values, use 'schema-array' instead.

## Properties

### kind

```ts
kind: "array";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:734](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/schema/fields.ts#L734)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:741](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/schema/fields.ts#L741)

The name of the field.

***

### options?

```ts
optional options?: {
  [key: string]: Value | undefined;
  arrayExtensions?: string[];
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:784](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/schema/fields.ts#L784)

Options to pass to the transform, if any

Must comply to the specific transform's options
schema.

#### Index Signature

```ts
[key: string]: Value | undefined
```

#### arrayExtensions?

```ts
optional arrayExtensions?: string[];
```

::: warning ⚠️ Dangerous Feature Ahead
:::

Configures which extensions this array is allowed to use.
Extensions are registered with the store's schema service
via [SchemaService.CAUTION\_MEGA\_DANGER\_ZONE\_registerExtension](../../schema-service/types/SchemaService.md#caution_mega_danger_zone_registerextension)

Extensions should only be used for temporary enhancements
to arrays to support migrating away from deprecated behaviors
such as Ember's "ArrayLike" and FragmentArray from ember-data-model-fragments

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:765](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/schema/fields.ts#L765)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [ArrayField.name](#name)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:774](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/schema/fields.ts#L774)

The name of a transform to pass each item
in the array through before displaying or
or serializing it.
