---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/core/types/schema/fields/types/CollectionField.md
description: >-
  Field schema of kind `collection` for a reference to other resources, whose
  value is a `ReactiveRelationshipDocument`.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1235](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/fields.ts#L1235)

Represents a field that is a reference to
a collection of other resources.

The value of a `collection` field on a ReactiveResource is a
`ReactiveRelationshipDocument` whose `data` is a reactive array
of the related resources, and whose `links` and `meta` mirror the
relationship payload received from the API.

```ts
const user = store.peekRecord<User>('user', '1');
user.friends.data; // User[] | undefined
user.friends.links; // { related: '/users/1/friends' }
```

The relationship payload for this field is expected to have the
shape `{ data?: { type, id }[], links?: Links, meta?: Meta }`.
When `data` is omitted from the payload `doc.data` is `undefined`
and `doc.fetch()` may be used to load the related resources via
the `related` link.

Collection relationships are not paginated: pagination links present
on the relationship are surfaced on `doc.links` but are never merged
into the relationship's membership. Large, sortable, filterable or
paginated lists should be loaded with a top-level request instead.
Apps may configure `maxCollectionRelationshipSize` on the store to
be alerted when a relationship payload grows past a chosen size.

In LegacyMode the relationship is mutable via `doc.data.push(record)`
(and the other array mutation methods) or `doc.data = [records]`.
In PolarisMode it is immutable unless the parent resource has been
checked out for editing.

## Properties

### kind

```ts
kind: "collection";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1241](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/fields.ts#L1241)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1248](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/fields.ts#L1248)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1291](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/fields.ts#L1291)

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

Whether the relationship is async.

For `collection` fields `async` describes what the API
sends for the relationship (see the Relationship
Specification in the manual):

* `true`: every payload for the relationship MUST carry a
  `links` object with a `related` link. `data` may be
  omitted; when present, every referenced resource MUST be
  included in the payload.
* `false` (default): whenever the relationship is present
  in a payload its `data` member MUST be present (an array,
  possibly empty) and every referenced resource MUST be
  included in the payload. The relationship SHOULD NOT
  carry `links`.

Related resources are never fetched automatically. Use
`doc.fetch()` or a top-level request to load them.

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1272](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/fields.ts#L1272)

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1282](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/fields.ts#L1282)

The name of the resource that this field
refers to. In the case of a polymorphic
relationship, this should be the trait
or abstract type.
