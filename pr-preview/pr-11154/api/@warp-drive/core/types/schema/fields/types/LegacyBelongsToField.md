---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/schema/fields/types/LegacyBelongsToField.md
---

# &#x20;LegacyBelongsToField

```ts
interface LegacyBelongsToField {
  kind: "belongsTo";
  name: string;
  options: { as?: string; async: boolean; inverse: string | null; linksMode?: true; polymorphic?: boolean; resetOnRemoteUpdate?: false };
  sourceKey?: string;
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1325](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L1325)

> \[!CAUTION]
> This Field is LEGACY

Represents a field that is a reference to
another resource.

This is the legacy version of the `ResourceField`.

## Properties

### kind

```ts
kind: "belongsTo";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1331](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L1331)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1338](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L1338)

The name of the field.

***

### options

```ts
options: {
  as?: string;
  async: boolean;
  inverse: string | null;
  linksMode?: true;
  polymorphic?: boolean;
  resetOnRemoteUpdate?: false;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1379](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L1379)

Options for belongsTo are mandatory.

#### as?

```ts
optional as?: string;
```

If this field is satisfying a polymorphic
relationship on another resource, then this
should be set to the trait or abstract type
that this resource implements.

#### async

```ts
async: boolean;
```

Whether the relationship is async

If true, it is expected that the cache
data for this field will contain a link
or a pointer that can be used to fetch
the related resource when needed.

Pointers are highly discouraged.

#### inverse

```ts
inverse: string | null;
```

The name of the inverse field on the
related resource that points back to
this field on this resource to form a
bidirectional relationship.

If null, the relationship is unidirectional.

If the inverse field definition uses a sourceKey,
this should still be the name of the field, not the sourceKey.

#### linksMode?

```ts
optional linksMode?: true;
```

Whether this field should ever make use of the legacy request infra
from @warp-drive/legacy/compat and the LegacyNetworkMiddleware for
adapters and serializers.

When true, none of the legacy support will be utilized. Sync relationships
(`async: false`, currently the only supported combination) must satisfy
one of the following whenever pushed to the cache:

* a `links.related` link is present, **or**
* the relationship is fully linked: `data` is `null`, or `data` points
  to a resource present in the document's `included` array

A related link lets you omit the related resource from `included`; a
`data` key that is missing entirely, or explicitly `undefined`, is never
valid unless a `links.related` link is present.

```ts
{
  data: {
    type: 'user',
    id: '2',
    attributes: { name: 'Chris' },
    relationships: {
      bestFriend: {
        links: { related: "/users/1/bestFriend" },
        data: { type: 'user', id: '1' },
      }
    }
  },
  included: [
    { type: 'user', id: '1', attributes: { name: 'Krystan' } }
  ]
}
```

Async relationships will be loaded via their link if needed.

#### polymorphic?

```ts
optional polymorphic?: boolean;
```

Whether this field is a polymorphic relationship,
meaning that it can point to multiple types of
resources so long as they implement the trait
or abstract type specified in `type`.

#### resetOnRemoteUpdate?

```ts
optional resetOnRemoteUpdate?: false;
```

When omitted, the cache data for this field will
clear local state of all changes except for the
addition of records still in the "new" state any
time the remote data for this field is updated.

When set to `false`, the cache data for this field
will instead intelligently commit any changes from
local state that are present in the remote data,
leaving any remaining changes in local state still.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1362](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L1362)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [LegacyBelongsToField.name](#name)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1372](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L1372)

The name of the resource that this field
refers to. In the case of a polymorphic
relationship, this should be the trait
or abstract type.
