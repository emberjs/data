---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/guides/the-manual/schemas/relational-fields.md
description: >-
  Placeholder for the guide to relational fields such as `resource`,
  `collection`, `belongsTo`, and `hasMany` on a ResourceSchema; no content yet.
---

# Relational Fields

Relational fields connect a resource to other resources. WarpDrive provides two field kinds for
this, plus two legacy kinds kept for apps migrating from `@warp-drive/legacy/model`.

| Kind | Cardinality | Value on the record |
| --- | --- | --- |
| `resource` | one | a `ReactiveRelationshipDocument` whose `data` is the related record or `null` |
| `collection` | many | a `ReactiveRelationshipDocument` whose `data` is a reactive array of records |
| `belongsTo` (legacy) | one | the related record, or a promise proxy when `async: true` |
| `hasMany` (legacy) | many | a `ManyArray`, or a promise proxy when `async: true` |

`resource` and `collection` behave identically in LegacyMode and PolarisMode and are the
recommended kinds for new schemas. The [Relational Data guide](../relational-data/index.md) covers
them in depth; this page covers the schema.

## Defining Relational Fields

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'name', kind: 'field' },
    {
      name: 'bestFriend',
      kind: 'resource',
      type: 'user',
      options: { inverse: 'bestFriend', async: false },
    },
    {
      name: 'pets',
      kind: 'collection',
      type: 'pet',
      options: { inverse: 'owner', async: false },
    },
  ],
});
```

* **`type`** — the related resource type. For a [polymorphic](../relational-data/features/polymorphism.md)
  relationship, the abstract type or trait the related resources implement.
* **`options.inverse`** — the name of the field on the related type that points back, or `null`
  for a one-way relationship. See [Inverses](../relational-data/features/inverses.md).
* **`options.async`** — the contract for what the API sends. `false` (default): `data` must be
  present whenever the relationship appears, and every referenced resource must be included.
  `true`: every payload must carry `links.related`; `data` is optional. Related data is never
  fetched automatically. See [Sync vs Async](../relational-data/features/sync-vs-async.md) and the
  [Relationship Specification](../relational-data/spec.md).
* **`options.polymorphic`** / **`options.as`** — declare a polymorphic relationship and the
  concrete types that satisfy it. See [Polymorphism](../relational-data/features/polymorphism.md).
* **`sourceKey`** — the key the API uses for this relationship when it differs from `name`.

## The Value

```ts
const user = store.peekRecord<User>('user', '1');

user.bestFriend.data;  // User | null | undefined
user.bestFriend.links; // { related: '/users/1/best-friend' } | undefined
user.bestFriend.meta;  // Record<string, unknown> | undefined

user.pets.data;        // Pet[] | undefined
```

The document mirrors the relationship payload the API sent (`data`, `links`, `meta`). `data` is
`undefined` when the payload carried no `data` member, `null`/`[]` when the relationship is known
to be empty. `doc.fetch()` requests the `related` link, writes the response's `data` into the
relationship, and resolves with the same document.

`links` and `meta` are server-owned and always reflect the last payload received; local mutations
only change `data`.

Type the fields with `ReactiveRelationshipDocument`:

```ts
import type { ReactiveRelationshipDocument } from '@warp-drive/core/reactive';

interface User {
  name: string;
  bestFriend: ReactiveRelationshipDocument<User | null>;
  pets: ReactiveRelationshipDocument<Pet[]>;
}
```

## Mutation

Relationships are changed through the document's `data` on an editable record (any LegacyMode
record, or a checked-out PolarisMode record). Assigning the field itself asserts.

```ts
editable.bestFriend.data = otherUser;
editable.pets.data.push(rex);
editable.pets.data = [rex, shen];
```

See [Adding & Removing](../relational-data/mutating/adding-removing.md).

## Collections Are Not Paginated

A `collection` holds the whole membership of the relationship. Lists that need paging, sorting or
filtering belong in a [top-level request](../relational-data/advanced/pagination.md). Configure
[`maxCollectionRelationshipSize`](../relational-data/advanced/large-collections.md) on the store to
be alerted when a relationship payload grows past a chosen size.

## Legacy `belongsTo` And `hasMany`

The legacy kinds are documented in the [LegacyMode](./resources/legacy-mode.md) guide and in
[LinksMode](../misc/links-mode.md). They require `options.async` and `options.inverse` to be set
explicitly and additionally accept `options.linksMode` and `options.resetOnRemoteUpdate`.

To move a legacy field to `resource` or `collection`, follow
[Migrating Relationships to `resource` and `collection`](/upgrading/v5/relationships.md).
