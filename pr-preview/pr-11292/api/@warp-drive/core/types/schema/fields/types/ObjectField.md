---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/schema/fields/types/ObjectField.md
---

# &#x20;ObjectField

```ts
interface ObjectField {
  kind: "object";
  name: string;
  options?: { [key: string]: Value | undefined; objectExtensions?: string[] };
  sourceKey?: string;
  type?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:473](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L473)

Represents a field whose value is an object
with keys pointing to values that are primitive
values.

If values of the keys are not primitives, or
if the key/value pairs have well-defined shape,
use 'schema-object' instead.

## Properties

### kind

```ts
kind: "object";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:479](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L479)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:486](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L486)

The name of the field.

***

### options?

```ts
optional options?: {
  [key: string]: Value | undefined;
  objectExtensions?: string[];
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:528](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L528)

Options to pass to the transform, if any

Must comply to the specific transform's options
schema.

#### Index Signature

```ts
[key: string]: Value | undefined
```

#### objectExtensions?

```ts
optional objectExtensions?: string[];
```

::: warning ⚠️ Dangerous Feature Ahead
:::

Configures which extensions this object should use.

Extensions are registered with the store's schema service
via [SchemaService.CAUTION\_MEGA\_DANGER\_ZONE\_registerExtension](../../schema-service/types/SchemaService.md#caution_mega_danger_zone_registerextension)

Extensions should only be used for temporary enhancements
to objects to support migrating away from deprecated patterns
like custom getters, computeds, and methods

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:510](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L510)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [ObjectField.name](#name)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:518](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L518)

The name of a transform to pass the entire object
through before displaying or serializing it.
