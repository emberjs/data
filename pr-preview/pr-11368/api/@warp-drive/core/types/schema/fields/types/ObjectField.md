---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/schema/fields/types/ObjectField.md
description: >-
  Field schema of kind `object` for a plain object of primitive values,
  optionally passed as a whole through a registered transformation.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:507](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L507)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:513](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L513)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:520](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L520)

The name of the field.

***

### options?

```ts
optional options?: {
  [key: string]: Value | undefined;
  objectExtensions?: string[];
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:562](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L562)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:544](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L544)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:552](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L552)

The name of a transform to pass the entire object
through before displaying or serializing it.
