---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/schema/fields/types/LinksModeBelongsToField.md
description: >-
  Legacy field schema of kind `belongsTo` in LinksMode: a sync reference to one
  related resource, loaded via links without adapters, usable in PolarisMode.
---

# &#x20;LinksModeBelongsToField

```ts
interface LinksModeBelongsToField {
  kind: "belongsTo";
  name: string;
  options: { as?: string; async: false; inverse: string | null; linksMode: true; polymorphic?: boolean };
  sourceKey?: string;
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1576](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L1576)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1582](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L1582)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1589](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L1589)

The name of the field.

***

### options

```ts
options: {
  as?: string;
  async: false;
  inverse: string | null;
  linksMode: true;
  polymorphic?: boolean;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1630](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L1630)

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
async: false;
```

Whether the relationship is async

MUST be false for PolarisMode + LinksMode

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

#### linksMode

```ts
linksMode: true;
```

Whether this field should ever make use of the legacy support infra
from @warp-drive/legacy/model and the LegacyNetworkMiddleware for adapters and serializers.

MUST be true for PolarisMode + LinksMode

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

Because `async` must be `false`, reading this field never fetches it;
its value comes only from data already in the cache.

Activating LinksMode will *also* deactivate the deprecated
`resetOnRemoteUpdate` behavior for this field.

This means that when new remote state is received, the cache
will intelligently commit any changes from local state that
are present in the remote data for this field, leaving any remaining
changes in local state still.

Previously, the cache would clear local state of all changes
except for the addition of records still in the "new" state any
time the remote data for this field was updated.

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1613](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L1613)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [LinksModeBelongsToField.name](#name)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1623](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L1623)

The name of the resource that this field
refers to. In the case of a polymorphic
relationship, this should be the trait
or abstract type.
