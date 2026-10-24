---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/guides/the-manual/relational-data/features/inverses.md
description: >-
  How the inverse option makes a relationship one-way or two-way, how WarpDrive
  keeps both sides of a two-way relationship in sync, and how direction affects
  which records see an edit and what gets loaded.
---

# Inverses and Directionality

Every relationship has a direction: it is declared on one resource type and points at another.
Whether the *other* side knows about it is decided by `options.inverse`. With `inverse: null` the
relationship is one-way; with the name of a field on the related type it is two-way, and that
field is its **inverse**.

## One-Way Relationships

```ts
{
  name: 'author',
  kind: 'resource',
  type: 'user',
  options: {
    inverse: null, // [!code highlight]
    async: false,
  },
}
```

::: tip Always declare `inverse`
Set `inverse` on every relationship field, to `null` or to a field name. WarpDrive never infers an
inverse: the legacy `belongsTo` and `hasMany` kinds require the option and assert when it is
missing. An explicit `null` also tells readers of the schema that the missing reverse field is
intentional.
:::

With `inverse: null` WarpDrive treats the relationship as one-way. Setting `post.author.data`
changes only `post`; the `user` has no field that reflects it. Internally the graph still tracks an
implicit reverse edge so it can clean up when a `user` is unloaded, but nothing is exposed.

Use one-way relationships when the reverse list would be large or meaningless (a comment's author
should not imply a user's list of every comment ever written) — see
[Large Collections](../advanced/large-collections.md).

The [one-to-none](../configuration/one-to-none.md) and
[many-to-none](../configuration/many-to-none.md) guides show a one-way relationship of each
cardinality.

## Two-Way Relationships

```ts
// on post
{ name: 'comments', kind: 'collection', type: 'comment', options: { inverse: 'post', async: false } }
// on comment
{ name: 'post', kind: 'resource', type: 'post', options: { inverse: 'comments', async: false } }
```

With inverses declared on both sides, a change to either side updates the other. Pushing a
`comment` whose `post` is `1` adds it to `post:1.comments`; removing it from `post.comments.data`
clears `comment.post.data`. The configuration guides show a two-way relationship of each
cardinality: [one-to-one](../configuration/one-to-one.md),
[one-to-many](../configuration/one-to-many.md) and
[many-to-many](../configuration/many-to-many.md).

Inverses may pair any relationship kinds: `collection` ↔ `resource`, `collection` ↔ `collection`,
`resource` ↔ `resource`, and each of these with the legacy `hasMany`/`belongsTo` kinds.

### How The Two Sides Are Matched

* `inverse` is the **`name`** of the field on the related type, not its `sourceKey`, and that
  field must exist and be a relationship field; WarpDrive asserts otherwise.
* Each field may be the inverse of only one relationship. If two fields on the same type both
  declare `inverse: 'owner'`, WarpDrive asserts; give one of them a different inverse or
  `inverse: null`, or introduce a join resource.
* A field may be its own inverse on a self-referential type, such as a `user` whose `friends`
  declares `inverse: 'friends'`.
* When the related `type` is an abstract type shared by several resources, mark the field
  `polymorphic: true`, and have each implementing resource declare `as` with that abstract type
  on its inverse field. [Polymorphism](./polymorphism.md) covers the setup; `as` together with
  `inverse: null` is an error, because with no inverse there is nothing to conform to.

## Which Records See An Edit

Direction also decides what an edit is visible from. In PolarisMode, a change made through a
checked-out `post` shows up on:

* the checked-out `post` (local state),
* a checked-out copy of the affected `comment` (local state of the inverse),

and does **not** show on the immutable `post` or `comment` until saved or committed. In LegacyMode
records read local state, so both sides reflect the edit immediately.

## Which Side To Load

The direction a relationship is loaded from matters for large lists. Loading the "one" side (a
`comment` with its `post`) is cheap; loading the "many" side (a `post` with all of its
`comments`) costs as much as the list is long. Prefer declaring the relationship's `data` on the
one side and expose the many side as a link or a top-level request — see
[Links vs Identifiers](./links-vs-identifiers.md).
