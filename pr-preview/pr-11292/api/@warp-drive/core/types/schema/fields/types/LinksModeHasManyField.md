---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/schema/fields/types/LinksModeHasManyField.md
---

# &#x20;LinksModeHasManyField

```ts
interface LinksModeHasManyField {
  kind: "hasMany";
  name: string;
  options: { arrayExtensions?: string[]; as?: string; async: false; inverse: string | null; linksMode: true; polymorphic?: boolean };
  sourceKey?: string;
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1861](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L1861)

> \[!CAUTION]
> This Field is LEGACY

Represents a field that is a reference to
a collection of other resources.

This is the legacy version of the `CollectionField`.

## Properties

### kind

```ts
kind: "hasMany";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1867](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L1867)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1874](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L1874)

The name of the field.

***

### options

```ts
options: {
  arrayExtensions?: string[];
  as?: string;
  async: false;
  inverse: string | null;
  linksMode: true;
  polymorphic?: boolean;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1915](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L1915)

Options for hasMany are mandatory.

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

If true, it is expected that the cache
data for this field will contain links
or pointers that can be used to fetch
the related resources when needed.

When false, it is expected that all related
resources are loaded together with this resource,
and that the cache data for this field will
contain the full list of pointers.

hasMany relationships do not support pagination. To page through a
large collection, request it as its own document and use the
experimental pagination primitives; see the
[Pagination guide](/guides/the-manual/experiments/pagination).

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
* the relationship is fully linked: `data` is `[]`, or every resource
  identifier in `data` is present in the document's `included` array

A related link lets you omit the related resources from `included`; a
`data` key that is missing entirely, or explicitly `undefined`, is never
valid unless a `links.related` link is present.

```ts
{
  data: {
    type: 'user',
    id: '2',
    attributes: { name: 'Chris' },
    relationships: {
      bestFriends: {
        links: { related: "/users/1/bestFriends" },
        data: [ { type: 'user', id: '1' } ],
      }
    }
  },
  included: [
    { type: 'user', id: '1', attributes: { name: 'Krystan' } }
  ]
}
```

Async relationships will be loaded via their link if needed.

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1898](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L1898)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [LinksModeHasManyField.name](#name)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1908](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L1908)

the name of the resource that this field
refers to. In the case of a polymorphic
relationship, this should be the trait
or abstract type.
