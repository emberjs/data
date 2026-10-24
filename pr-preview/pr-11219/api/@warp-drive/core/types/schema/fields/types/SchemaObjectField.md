---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/types/schema/fields/types/SchemaObjectField.md
description: >-
  Field schema of kind `schema-object` for a nested object whose shape is
  described by an `ObjectSchema`, with optional polymorphism.
---

# &#x20;SchemaObjectField

```ts
interface SchemaObjectField {
  kind: "schema-object";
  name: string;
  options?: { defaultValue?: boolean; objectExtensions?: string[]; polymorphic?: boolean; type?: string };
  sourceKey?: string;
  type: string | null;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:599](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/schema/fields.ts#L599)

Represents a field whose value is an object
with a well-defined structure described by
a schema-object (a non-resource schema).

The [Complex Fields](/guides/the-manual/schemas/complex-fields#schema-objects) guide
shows how to use it.

If the object's structure is not well-defined,
use 'object' instead.

By default, a SchemaObject within

## Properties

### kind

```ts
kind: "schema-object";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:605](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/schema/fields.ts#L605)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:612](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/schema/fields.ts#L612)

The name of the field.

***

### options?

```ts
optional options?: {
  defaultValue?: boolean;
  objectExtensions?: string[];
  polymorphic?: boolean;
  type?: string;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:662](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/schema/fields.ts#L662)

Options for configuring the behavior of the
SchemaObject.

* `polymorphic` : Whether this SchemaObject is Polymorphic.
* `type` : If the SchemaObject is Polymorphic, the key on the raw cache data to use as the "resource-type" value for the schema-object.

#### defaultValue?

```ts
optional defaultValue?: boolean;
```

If true, if no value for this field exists in the cache,
an empty `{}` will be used as the source for a new SchemaObject
of the associated schema type, as opposed to the field's
value being `null`.

If `polymorphic` is `true`, defaultValue will be considered `false`.

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

#### polymorphic?

```ts
optional polymorphic?: boolean;
```

Whether this SchemaObject is Polymorphic.

If the SchemaObject is polymorphic, `options.type` must also be supplied.

#### type?

```ts
optional type?: string;
```

If the SchemaObject is Polymorphic, the key on the raw cache data to use
as the "resource-type" value for the schema-object.

The default is `'type'`.

Valid options are:

* `'@hash'`                : will lookup the `@hash` function specified by
  SchemaObjectField.type and use it to calculate the type for each value.
* \<field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
  Are valid field names for this purpose. The cache state without transforms applied will be
  used when comparing values.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:636](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/schema/fields.ts#L636)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [SchemaObjectField.name](#name)

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

### type

```ts
type: string | null;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:651](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/schema/fields.ts#L651)

If the field is not polymorphic:

The name of the ObjectSchema that describes the
structure of the object.

If the field is polymorphic:

The name of the hashFn to use to extract
the type from the contained value or null.
