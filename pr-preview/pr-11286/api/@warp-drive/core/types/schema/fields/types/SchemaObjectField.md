---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/schema/fields/types/SchemaObjectField.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:560](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L560)

Represents a field whose value is an object
with a well-defined structure described by
a schema-object (a non-resource schema).

If the object's structure is not well-defined,
use 'object' instead.

By default, a SchemaObject within

## Properties

### kind

```ts
kind: "schema-object";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:566](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L566)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:573](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L573)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:623](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L623)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:597](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L597)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:612](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L612)

If the field is not polymorphic:

The name of the ObjectSchema that describes the
structure of the object.

If the field is polymorphic:

The name of the hashFn to use to extract
the type from the contained value or null.
