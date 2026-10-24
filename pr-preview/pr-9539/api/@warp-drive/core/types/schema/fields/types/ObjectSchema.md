---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/schema/fields/types/ObjectSchema.md
description: >-
  Schema describing an embedded object that has no identity of its own, used by
  `schema-object` and `schema-array` fields.
---

# &#x20;ObjectSchema

```ts
interface ObjectSchema {
  fields: ObjectFieldSchema[];
  identity: HashField | null;
  objectExtensions?: string[];
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2466](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L2466)

Represents a schema for an object that is not
a primary resource (has no unique identity of its own).

The [ObjectSchemas](/guides/the-manual/schemas/object-schemas) guide shows how to
define and register one.

ObjectSchemas may not currently contain relationships.

## Properties

### fields

```ts
fields: ObjectFieldSchema[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2500](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L2500)

The fields that make up the shape of the object

***

### identity

```ts
identity: HashField | null;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2476](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L2476)

Either a HashField from which to calculate an identity or null

In the case of `null`, the object's identity will be based
on the referential identity of the object in the cache itself
when an identity is needed.

***

### objectExtensions?

```ts
optional objectExtensions?: string[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2515](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L2515)

::: warning ⚠️ Dangerous Feature Ahead
:::

Configures which extensions this object should use.

Extensions are registered with the store's schema service
via [SchemaService.CAUTION\_MEGA\_DANGER\_ZONE\_registerExtension](../../schema-service/types/SchemaService.md#caution_mega_danger_zone_registerextension)

Extensions should only be used for temporary enhancements
to objects to support migrating away from deprecated patterns
like custom getters, computeds, and methods

***

### type

```ts
type: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2493](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/schema/fields.ts#L2493)

The name of the schema

The names of object and resource schemas share
a single namespace and must not conflict.

We recommend a naming convention for object schemas
such as below for ensuring uniqueness:

* for globally shared objects: The pattern `$field:${KlassName}` e.g. `$field:AddressObject`
* for resource-specific objects: The pattern `$${ResourceKlassName}:$field:${KlassName}` e.g. `$User:$field:ReusableAddress`
* for inline objects: The pattern `$${ResourceKlassName}.${fieldPath}:$field:anonymous` e.g. `$User.shippingAddress:$field:anonymous`
