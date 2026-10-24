---
url: https://canary.warp-drive.io/pr-preview/pr-11238/upgrading/v5/relationships.md
---

# Migrating Relationships to `resource` and `collection`

&#x20;  authored 2026-09-24

This guide is for apps whose schemas use the legacy `belongsTo` and `hasMany` field kinds, whether
declared with decorators on a `Model` or as fields on a `ReactiveResource` schema in
[LegacyMode](/guides/the-manual/schemas/resources/legacy-mode.md) or
[PolarisMode](/guides/the-manual/schemas/resources/polaris-mode.md), and that want to move those
fields to the `resource` and `collection` kinds. It assumes you know how the legacy kinds behave
and introduces the new ones as it goes.

If your app still uses `Model`, migrate to `ReactiveResource` in LegacyMode first (see
[Migration](/guides/the-manual/schemas/resources/legacy-mode.md#migration)); `resource` and
`collection` are schema field kinds and have no decorator form.

If the relationships are consumed implicitly today, through an `#each` over an async
relationship, `.content`, or getters that read through one, read
[Migrating Async Relationship Usage](./relationship-usage.md) alongside this page; it covers the
code, this page covers the fields.

`belongsTo` and `hasMany` are not deprecated by this guide and continue to work. Migrate field by
field, in whatever order suits the app; a `resource` field may declare a `belongsTo` or `hasMany`
as its inverse and vice versa (see [Directionality](/guides/the-manual/relational-data/advanced/directionality.md)).

## What Changed

The legacy kinds and the new kinds differ in four ways that drive everything below.

**The value is a document, not the record.** `post.author` is no longer the `Author` record (or a
promise proxy for it). It is a
[relationship document](/api/@warp-drive/core/reactive/types/ReactiveRelationshipDocument) whose
`data` is the related record (or records), and whose `links` and `meta` are whatever the API sent
for the relationship:

```ts
post.author.data;    // Author | null | undefined
post.author.links;   // { related: '/posts/1/author' } | undefined
post.comments.data;  // Comment[] | undefined
```

**Async relationships no longer autofetch, and there is no promise proxy.** With `belongsTo` and
`hasMany`, `async: true` meant "accessing the property fetches whatever is missing and returns a
promise". With `resource` and `collection`, `async: true` means "this relationship can be fetched
directly", which is why every payload for it must carry a `links.related` link. Reading
`post.comments.data` never triggers a request. An async relationship whose members arrived in a
payload (in its `data` or its `included`) is read synchronously, exactly like a sync one; one whose
members have not arrived reads as `undefined` until a payload carrying them does (see
[Step 5: Load Async Relationships](#step-5-load-async-relationships)).

**Referenced resources must be included.** Whatever the value of `async`, every resource the
relationship's `data` points at must be present in the payload that references it, as its primary
`data` or in `included`. The [JSON:API validator](/guides/the-manual/relational-data/spec.md#_3-4-enforcement)
reports a missing resource as an error, and reading `doc.data` for a member that was never loaded
throws instead of producing an empty record. The legacy kinds tolerate dangling
references; the new ones do not. See
[Patterns Without a Migration Path](#patterns-without-a-migration-path) before you start.

**Mutation goes through `data`.** Assigning the field (`post.author = user`) asserts in every mode.
Set `post.author.data`, or mutate the array at `post.comments.data`. In PolarisMode this requires a
checked-out copy of the record; in LegacyMode records are always editable.

The full rules are in the
[Relationship Specification](/guides/the-manual/relational-data/spec.md#_3-rules-for-resource-and-collection-relationships).

## Patterns Without a Migration Path

Two legacy usages relied on the cache holding a `{ type, id }` reference to a resource that was
never delivered. Support for them is intentionally removed from `resource` and `collection`, and
there is currently no equivalent:

1. **A relationship whose `data` references resources that are not in the payload**, sync or
   async, because the app fetched them later by their reference (for example `findRecord` on the
   id), or because a different request had already loaded them, or would load them afterwards and
   "backfill" the value.
2. **Reading identifiers without loading the members**: `record.belongsTo('author').id()` and
   `record.hasMany('comments').ids()` to get related ids out of such a relationship without
   triggering a fetch.

Once such a field is migrated, its payloads are validator errors and reading its `data` throws.
Do not migrate these fields yet. Leave them on `belongsTo`/`hasMany`, which keep
working alongside migrated fields, or change the API to include the referenced resources or to
send a `related` link instead of the references.

Corollaries for both use cases are planned as two new field kinds, `reference` and `pointer`,
which will hold an identifier without requiring the resource to be loaded. Watch for the RFC
proposing them; it will provide the upgrade path for these fields.

## Step 1: Classify Each Relationship

For every `belongsTo`/`hasMany` field, look at what the API actually sends for it and pick a row.

| The API sends... | Migrate to | Notes |
| --- | --- | --- |
| the members, sideloaded with the parent, every time | `async: false` | `data` must be present whenever the relationship is; `links` should be absent (the validator warns). |
| a `links.related` link, with or without the members | `async: true` | The link is required in every payload. If members are also sent, they must be included and are readable synchronously. |
| references in `data` but not the resources | nothing yet | See [Patterns Without a Migration Path](#patterns-without-a-migration-path). |
| a large, pageable or filterable list | a top-level request, not a relationship | See [Large Collections](/guides/the-manual/relational-data/advanced/large-collections.md). |

Fields declared `linksMode: true` fall in the first two rows depending on whether the API sends a
link; `linksMode` itself has no meaning for the new kinds and is dropped.

## Step 2: Convert the Field

Change `kind`, keep `name`, `type`, `sourceKey` and the `inverse`, `polymorphic` and `as` options,
and set `async` per the table above:

```ts
// before
{ kind: 'belongsTo', name: 'author', type: 'user', options: { async: false, inverse: 'posts' } }
{ kind: 'hasMany', name: 'comments', type: 'comment', options: { async: true, inverse: 'post', linksMode: true } }

// after
{ kind: 'resource', name: 'author', type: 'user', options: { async: false, inverse: 'posts' } }
{ kind: 'collection', name: 'comments', type: 'comment', options: { async: true, inverse: 'post' } }
```

Drop `linksMode` and `resetOnRemoteUpdate`. The new kinds always load through requests, and a
remote update never discards unsaved local changes (the behavior `resetOnRemoteUpdate: false`
opted into), so neither option has a meaning for them. If the field is
typed, change `author: User` to `author: ReactiveRelationshipDocument<User | null>` and
`comments: Comment[]` to `comments: ReactiveRelationshipDocument<Comment[]>`.

Field-level details are in [Relational Fields](/guides/the-manual/schemas/relational-fields.md).

## Step 3: Update Reads

| Before | After |
| --- | --- |
| `post.author` (sync) | `post.author.data` |
| `await post.author` (async) | `post.author.data` when the author was included; otherwise load it first, see below |
| `post.comments` (a `ManyArray`) | `post.comments.data` |
| `post.comments.content` / `(await post.comments)` | `post.comments.data` |
| `post.comments.links`, `post.comments.meta` | unchanged |
| `post.belongsTo('author').value()` | `post.author.data` |
| `post.hasMany('comments').value()` | `post.comments.data` |
| `post.belongsTo('author').link()` | `post.author.links?.related` |
| `post.hasMany('comments').meta()` | `post.comments.meta` |
| `post.hasMany('comments').load()` / `.reload()` | `post.comments.fetch()` |
| `post.belongsTo('author').id()`, `post.hasMany('comments').ids()` | none, see [Patterns Without a Migration Path](#patterns-without-a-migration-path) |

`data` has one value the legacy kinds never produced: `undefined`, meaning the relationship has
not received membership yet (a links-only payload). `null` and `[]` still mean known-empty. Guard
for it where an async relationship may not have loaded.

The document and its `data` array are stable instances per record, so templates and getters that
hold onto them keep working as the cache changes. See
[Resource Relationships](/guides/the-manual/relational-data/features/resource-relationships.md)
and [Collection Relationships](/guides/the-manual/relational-data/features/collection-relationships.md).

## Step 4: Update Writes

| Before | After |
| --- | --- |
| `post.author = user` | `post.author.data = user` |
| `post.author = null` | `post.author.data = null` |
| `post.comments.push(comment)` (and other array methods) | `post.comments.data.push(comment)` |
| `post.comments = [a, b]` | `post.comments.data = [a, b]` |
| `store.createRecord('post', { author, comments })` | unchanged: create arguments seed the relationship, they are not assigned to the field |

In PolarisMode all of these require the
[checked-out copy](/guides/the-manual/schemas/resources/polaris-mode.md) of the record; on the
immutable record they assert. Saving is unchanged: serialize the identifiers in `data`, never `links` or `meta`. See
[Adding & Removing](/guides/the-manual/relational-data/mutating/adding-removing.md) and
[Saving](/guides/the-manual/relational-data/mutating/saving.md).

## Step 5: Load Async Relationships

Because nothing fetches on access, every async relationship needs an explicit load somewhere, and
this is usually the largest part of the migration. `doc.data` is `undefined` until a payload that
carries the relationship's `data` (and includes the members) reaches the cache. You have two ways
to make that happen.

**Include it in the request that loads the parent.** Once the members arrive with the parent,
`doc.data` is readable synchronously and stays so. This is the simplest path for relationships a
screen always needs:

```ts
import { findRecord } from '@warp-drive/utilities/json-api';

const { content } = await store.request(findRecord('post', id, { include: ['author', 'comments'] }));
content.data.comments.data; // Comment[]
```

**Fetch the link.** `doc.fetch()` requests `links.related`, writes the members the response
returns into the relationship, and resolves with the relationship document itself. After it
settles, `post.comments.data` is readable synchronously, the same as if the members had been
included with the post. To get loading and error states in a template, store the promise
`fetch()` returns and derive its state with
[`getPromiseState`](/guides/the-manual/reactivity/derivation.md), or request the link with a
[`<Request />` component](/guides/the-manual/requests/index.md#reactive-control-flow) and render
the response:

```ts
const comments = await post.comments.fetch();
comments === post.comments; // true
post.comments.data;         // Comment[]
```

`findRecord`, `store.request` and response documents are covered in
[Making Requests](/guides/the-manual/requests/index.md).

Pagination, sorting and filtering are never done through the relationship; see
[Pagination](/guides/the-manual/relational-data/advanced/pagination.md).

## Step 6: Verify

* Run the app in development with the
  [JSON:API validator](/guides/the-manual/relational-data/spec.md#_3-4-enforcement) active. It
  reports, per relationship, a missing `related` link on an async field (error), a missing `data`
  member on a sync field (error), any referenced resource that was not included (error), and
  links on a sync field (warning).
* Search for `.belongsTo(` and `.hasMany(`: every remaining reference call is either on a field
  you left legacy or has a replacement in the tables above.
* Search for `.content` on relationship values and for `await record.<relationship>`; neither has
  a meaning on a relationship document.

Where each rule is enforced (validator, graph, runtime) is listed in the
[Relationship Specification](/guides/the-manual/relational-data/spec.md#_3-4-enforcement).
