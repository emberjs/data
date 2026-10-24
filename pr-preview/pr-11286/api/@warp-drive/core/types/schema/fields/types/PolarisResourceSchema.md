---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/schema/fields/types/PolarisResourceSchema.md
---

# &#x20;PolarisResourceSchema

```ts
interface PolarisResourceSchema {
  fields: PolarisModeFieldSchema[];
  identity: IdentityField;
  legacy?: false;
  traits?: string[];
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2195](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2195)

Represents a schema for a primary resource in PolarisMode.

Primary resources are objects with a unique identity of their
own which may allow them to appear in relationships, or in multiple
response documents.

## Properties

### fields

```ts
fields: PolarisModeFieldSchema[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2240](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2240)

The fields that make up the shape of the resource

***

### identity

```ts
identity: IdentityField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2210](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2210)

For primary resources, this should be an IdentityField

for schema-objects, this should be either a HashField or null

***

### legacy?

```ts
optional legacy?: false;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2201](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2201)

A flag indicating that this is not a legacy resource schema.

***

### traits?

```ts
optional traits?: string[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2252](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2252)

A list of traits that this resource implements. The fields for these
traits should still be defined in the fields array.

Each trait should be a string that matches the `type` of another
resource schema. The trait can be abstract and reference a resource
type that is never defined as a schema.

***

### type

```ts
type: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2233](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2233)

The name of the schema

For cacheable resources, this should be the
primary resource type.

For object schemas, this should be the name
of the object schema.

The names of object and resource schemas share
a single namespace and must not conflict.

We recommend a naming convention for object schemas
such as below for ensuring uniqueness:

* for globally shared objects: The pattern `$field:${KlassName}` e.g. `$field:AddressObject`
* for resource-specific objects: The pattern `$${ResourceKlassName}:$field:${KlassName}` e.g. `$User:$field:ReusableAddress`
* for inline objects: The pattern `$${ResourceKlassName}.${fieldPath}:$field:anonymous` e.g. `$User.shippingAddress:$field:anonymous`
