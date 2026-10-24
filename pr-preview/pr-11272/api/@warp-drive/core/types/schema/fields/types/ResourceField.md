---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/schema/fields/types/ResourceField.md
---

# &#x20;ResourceField

```ts
interface ResourceField {
  kind: "resource";
  name: string;
  options?: { as?: string; async?: boolean; inverse?: string | null; polymorphic?: boolean };
  sourceKey?: string;
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1014](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1014)

Represents a field that is a reference to
another resource.

SUPPORT FOR THIS FEATURE IS NOT YET IMPLEMENTED
BY ReactiveResource

## Properties

### kind

```ts
kind: "resource";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1020](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1020)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1027](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1027)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1070](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1070)

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
data for this field will contain a link
that can be used to fetch the related
resource when needed.

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1051](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1051)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [ResourceField.name](#name)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1061](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/schema/fields.ts#L1061)

The name of the resource that this field
refers to. In the case of a polymorphic
relationship, this should be the trait
or abstract type.
