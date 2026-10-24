---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/schema/fields/types/ArrayField.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:687](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L687)

Represents a field whose value is an array
of primitive values.

If the array's elements are not primitive
values, use 'schema-array' instead.

## Properties

### kind

```ts
kind: "array";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:693](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L693)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:700](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L700)

The name of the field.

***

### options?

```ts
optional options?: {
  [key: string]: Value | undefined;
  arrayExtensions?: string[];
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:743](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L743)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:724](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L724)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:733](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L733)

The name of a transform to pass each item
in the array through before displaying or
or serializing it.
