---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/schema/fields/types/SchemaArrayField.md
---

# &#x20;SchemaArrayField

```ts
interface SchemaArrayField {
  kind: "schema-array";
  name: string;
  options?: { arrayExtensions?: string[]; defaultValue?: boolean; key?: string; objectExtensions?: string[]; polymorphic?: boolean; type?: string };
  sourceKey?: string;
  type: string | null;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:772](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L772)

Represents a field whose value is an array
of objects with a well-defined structure
described by a non-resource schema.

If the array's elements are not well-defined,
use 'array' instead.

## Properties

### kind

```ts
kind: "schema-array";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:778](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L778)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:785](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L785)

The name of the field.

***

### options?

```ts
optional options?: {
  arrayExtensions?: string[];
  defaultValue?: boolean;
  key?: string;
  objectExtensions?: string[];
  polymorphic?: boolean;
  type?: string;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:855](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L855)

Options for configuring the behavior of the
SchemaArray.

* `key`

Configures how the SchemaArray determines whether an object in the cache is the same
as an object previously used to instantiate one of the schema-objects it contains.

The default is `'@identity'`.

Valid options are:

* `'@identity'`(default)  : the cached object's referential identity will be used.
  This may result in significant instability when resource data is updated from the API

* `'@index'`              : the cached object's index in the array will be used.
  This is only a good choice for arrays that rarely if ever change membership

* `'@hash'`               : will lookup the `@hash` function supplied in the ResourceSchema for
  The contained schema-object and use the computed result to determine and compare identity.

* \<field-name> (string)  : the name of a field to use as the key, only GenericFields (kind `field`)
  Are valid field names for this purpose. The cache state without transforms applied will be
  used when comparing values. The field value should be unique enough to guarantee two schema-objects
  of the same type will not collide.

* `polymorphic` : Whether this SchemaArray is Polymorphic.

* `type` : If the SchemaArray is Polymorphic, the key on the raw cache data to use as the "resource-type" value for the schema-object.

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

#### defaultValue?

```ts
optional defaultValue?: boolean;
```

If true, if no value for this field exists in the cache,
an empty `[]` will be used as the value of the field,
as opposed to the field's value being `null`.

#### key?

```ts
optional key?: string;
```

Configures how the SchemaArray determines whether
an object in the cache is the same as an object
previously used to instantiate one of the schema-objects
it contains.

The default is `'@identity'`.

Valid options are:

* `'@identity'` (default) : the cached object's referential identity will be used.
  This may result in significant instability when resource data is updated from the API
* `'@index'`              : the cached object's index in the array will be used.
  This is only a good choice for arrays that rarely if ever change membership
* `'@hash'`               : will lookup the `@hash` function supplied in the ResourceSchema for
  The contained schema-object and use the computed result to determine and compare identity.
* \<field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
  Are valid field names for this purpose. The cache state without transforms applied will be
  used when comparing values. The field value should be unique enough to guarantee two schema-objects
  of the same type will not collide.

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

Whether this SchemaArray is Polymorphic.

If the SchemaArray is polymorphic, `options.type` must also be supplied.

#### type?

```ts
optional type?: string;
```

If the SchemaArray is Polymorphic, the key on the raw cache data to use
as the "resource-type" value for the schema-object.

The default is `'type'`.

Valid options are:

* `'@hash'`                : will lookup the `@hash` function specified by
  SchemaArrayField.type and use it to calculate the type for each value.
* \<field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
  Are valid field names for this purpose. The cache state without transforms applied will be
  used when comparing values.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:809](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L809)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [SchemaArrayField.name](#name)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:824](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L824)

If the SchemaArray is not polymorphic:

The name of the ObjectSchema that describes the
structure of the objects in the array.

If the SchemaArray is polymorphic:

The name of the hashFn to use to extract
the type from contained members or null.
