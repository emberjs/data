---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/schema/fields/types/CollectionField.md
---

# &#x20;CollectionField

```ts
interface CollectionField {
  kind: "collection";
  name: string;
  options?: { as?: string; async?: boolean; inverse?: string | null; polymorphic?: boolean };
  sourceKey?: string;
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1127](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1127)

Represents a field that is a reference to
a collection of other resources, potentially
paginate.

SUPPORT FOR THIS FEATURE IS NOT YET IMPLEMENTED
BY ReactiveResource

## Properties

### kind

```ts
kind: "collection";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1133](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1133)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1140](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1140)

The name of the field.

***

### options?

```ts
optional options?: {
  as?: string;
  async?: boolean;
  inverse?: string | null;
  polymorphic?: boolean;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1183](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1183)

Options for resources are optional. If
not present, all options are presumed
to be falsey

#### as?

```ts
optional as?: string;
```

If this field is satisfying a polymorphic
relationship on another resource, then this
should be set to the trait or abstract type
that this resource implements.

#### async?

```ts
optional async?: boolean;
```

Whether the relationship is async

If true, it is expected that the cache
data for this field will contain links
that can be used to fetch the related
resources when needed.

When false, it is expected that all related
resources are loaded together with this resource,
and that the cache data for this field will
contain the full list of pointers.

When true, it is expected that the relationship
is paginated. If the relationship is not paginated,
then the cache data for "page 1" would contain the
full list of pointers, and loading "page 1" would
load all related resources.

#### inverse?

```ts
optional inverse?: string | null;
```

The name of the inverse field on the
related resource that points back to
this field on this resource to form a
bidirectional relationship.

If null, the relationship is unidirectional.

#### polymorphic?

```ts
optional polymorphic?: boolean;
```

Whether this field is a polymorphic relationship,
meaning that it can point to multiple types of
resources so long as they implement the trait
or abstract type specified in `type`.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1164](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1164)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [CollectionField.name](#name)

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
type: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1174](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1174)

The name of the resource that this field
refers to. In the case of a polymorphic
relationship, this should be the trait
or abstract type.
