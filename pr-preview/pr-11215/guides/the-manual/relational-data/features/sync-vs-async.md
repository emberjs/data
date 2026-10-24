---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/guides/the-manual/relational-data/features/sync-vs-async.md
---
# Sync vs Async

Every relationship field declares `options.async`. For `resource` and `collection` fields the flag
is a **contract about what the API sends**, and WarpDrive enforces it. The precise rules are in the
[Relationship Specification](../spec.md#_3-rules-for-resource-and-collection-relationships); this
page explains them.

## The Rule That Always Applies

Whatever the value of `async`, every resource referenced in a `resource` or `collection`
relationship's `data` **must be included** in the payload that references it (in the document's
`data` or `included`). The JSON:API validator reports a missing resource as an error, and reading
`doc.data` for a member that was never loaded throws rather than producing an empty record.

This is the main difference from the legacy `belongsTo`/`hasMany` kinds, which tolerate references
to resources that are not loaded.

## `async: false` (sync, the default)

The relationship is fully delivered with its parent.

```ts
{ name: 'tags', kind: 'collection', type: 'tag', options: { inverse: null, async: false } }
```

Whenever the relationship appears in a payload:

* its `data` member **must** be present (`null` or an identifier for a resource, an array for a
  collection). A links-only or meta-only payload is an error.
* every referenced resource **must** be included.
* it **should not** carry `links`. Links are never needed to load a sync relationship, so their
  presence usually means the field is misdeclared. The validator warns; the warning can be made an
  error with the `strict.syncRelationshipLinks` setting.

With a sync relationship `doc.data` is always usable right away: the related record for a resource,
an array of related records for a collection, or `null`/`[]` when empty.

Use sync relationships for data that is always needed together with its parent and is small enough
to send with it.

## `async: true`

The relationship is loaded on demand through a link.

```ts
{ name: 'comments', kind: 'collection', type: 'comment', options: { inverse: 'post', async: true } }
```

Every payload for the relationship **must** carry a `links` object with a `related` link. The
validator reports a missing link as an error and the graph asserts on it in development builds.
`data` may be omitted; until a payload with `data` arrives, `doc.data` is `undefined`:

```ts
post.comments.data;          // undefined
await post.comments.fetch(); // requests post.comments.links.related
post.comments.data;          // the comments the response returned
```

If a payload does include `data`, the referenced resources must be included, exactly as for sync
relationships.

WarpDrive does **not** fetch async relationships automatically: nothing is loaded until you call
`fetch()`, which fills in `doc.data` and resolves with the relationship document. This differs from the legacy `belongsTo`/`hasMany`
fields, which wrap async relationships in promise proxies that fetch on access.

Use async relationships when the related data is optional, expensive, or belongs to a different
part of the UI than its parent.

## Choosing

| The API... | Declare |
| --- | --- |
| always sends the members with the parent | `async: false` |
| sends a link and the members are loaded separately | `async: true` |
| sends a link *and* the members | `async: true` (the link is required; the data is a bonus) |
| sends a large, pageable or filterable list | neither: model it as its own endpoint and load it with a [top-level request](../advanced/large-collections.md) |
