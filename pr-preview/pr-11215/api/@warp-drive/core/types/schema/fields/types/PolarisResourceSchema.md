---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/schema/fields/types/PolarisResourceSchema.md
description: >-
  Schema describing a PolarisMode resource type: its `@id` identity field, its
  fields, and the traits it implements.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2333](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2333)

Represents a schema for a primary resource in PolarisMode.

Primary resources are objects with a unique identity of their
own which may allow them to appear in relationships, or in multiple
response documents.

## Properties

### fields

```ts
fields: PolarisModeFieldSchema[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2378](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2378)

The fields that make up the shape of the resource

***

### identity

```ts
identity: IdentityField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2348](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2348)

For primary resources, this should be an IdentityField

for schema-objects, this should be either a HashField or null

***

### legacy?

```ts
optional legacy?: false;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2339](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2339)

A flag indicating that this is not a legacy resource schema.

***

### traits?

```ts
optional traits?: string[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2390](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2390)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2371](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2371)

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
