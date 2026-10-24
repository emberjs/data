---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/guides/the-manual/relational-data/features/links-mode.md
description: >-
  How LinksMode lets a legacy belongsTo or hasMany relationship load through
  store.request instead of an adapter, when to use it before moving to resource
  and collection, and how it differs between Model, LegacyMode and PolarisMode.
---

# LinksMode

**LinksMode** is an option for the legacy `belongsTo` and `hasMany` field kinds. With
`linksMode: true`, the relationship is fetched through the store's request pipeline, using the
relationship's `related` link, instead of through the legacy `adapter` interface.

::: tip Writing a new relationship? Use `resource` or `collection`
The [`resource`](./resource-relationships.md) and [`collection`](./collection-relationships.md)
field kinds replace `belongsTo` and `hasMany`. They always load through requests, the way LinksMode
makes the legacy kinds load, so `linksMode` has no meaning for them. LinksMode is for relationships
that still use the legacy kinds.
:::

## When To Use It

Use LinksMode on a `belongsTo` or `hasMany` field you are not ready to convert yet, once the app
fetches that relationship through requests rather than adapters. It is often the step just before
converting the field:
[Migrating Async Relationship Usage](/upgrading/v5/relationship-usage.md#phase-2-load-through-requests)
turns it on in Phase 2, and
[Migrating Relationships to `resource` and `collection`](/upgrading/v5/relationships.md) then
converts the field and drops the option.

## What The API Must Send

Relationships are stored with the same top-level structure as resource documents, adopted from the
[JSON:API](https://jsonapi.org) specification: `data` holds the membership, and `links` and `meta`
are optional.

For a field in LinksMode, every payload for the relationship must satisfy one of the following:

* the relationship has a `links.related` link, **or**
* the relationship is "fully linked": for `belongsTo`, `data` is `null` or points to a resource
  that is present in the document's `included` array; for `hasMany`, `data` is `[]` or every
  resource identifier in `data` is present in `included`.

In other words, a `related` link lets you leave the related resources out of `included`; without a
link, the relationship must either be empty or have its related resources sideloaded. A
relationship whose `data` key is missing entirely is never valid on its own: without a link or an
explicit empty value, WarpDrive cannot tell "no data was returned" from "the relationship is
empty".

```ts
interface LinksModeRelationship {
  meta?: Record<string, Value>;

  // required unless `data` is empty (`null` / `[]`), or every resource in
  // `data` is included in the document
  links?: {
    related: string | { href: string };

    // other links as desired
  };
}
```

If your API does not provide `related` links, a [request handler](/api/@warp-drive/core/request/types/Handler)
can add them to responses, provided your handlers (or your API) understand those links. This works
even if your API needs a `POST` to fetch a relationship;
[this blog post](https://runspired.com/2025/02/26/exploring-advanced-handlers.html) shows the same
technique applied to pagination.

## The Request It Issues

Fetching the relationship, via `relationship.reload`, `reference.reload`, `reference.load` or
`await record.relationship`, sends a request through your handler chain that looks like this:

```ts
interface FetchRelationshipRequest {
  op: 'findHasMany' | 'findBelongsTo';
  store: Store;
  url: string; // the related link
  method: 'GET';
  records: ResourceKey[]; // the current membership of the relationship
  data: {
    field: LegacyBelongsToField | LegacyHasManyField;
    links: Links;
    meta: Meta;
    options: unknown; // any options passed to `reload` or `load`
    record: ResourceKey; // the parent record
  };

  // tells the store to not automatically convert the response into something reactive
  // since the reactive relationship class itself will do that
  [EnableHydration]: false;
}
```

The three most important things in this request are:

* the `op` code: this is how the cache knows to use the response to update the state of a
  relationship
* `data.field`: this is how the cache knows which field to update
* `data.record`: this is how the cache knows which record the response belongs to

Your handler should return a standard JSON:API document, straight from your API or normalized on
the client. The resources in its `data` are inserted into the cache and become the membership of
the relationship; its `meta` and `links` become the relationship's `meta` and `links`. Included
resources are allowed.

## Turning It On

Add `linksMode: true` to the relationship's options. It only changes the field it is set on: in the
examples below, `homeAddress` is fetched in LinksMode while `<Address>.residents` may still use the
adapter.

### On a Model

```ts
import Model, { belongsTo } from '@warp-drive/legacy/model';

export default class User extends Model {
  @belongsTo('address', { async: false, inverse: 'residents', linksMode: true })
  homeAddress;
}
```

On a `Model`, LinksMode changes how the relationship is fetched whether it is `async` or not.

### On a ReactiveResource In LegacyMode

```ts
import type { ResourceSchema } from '@warp-drive/core/types/schema/fields';

const UserSchema = {
  type: 'user',
  // this is what puts the record instance into LegacyMode
  legacy: true,
  fields: [
    {
      kind: 'belongsTo',
      name: 'homeAddress',
      type: 'address',
      options: { async: false, inverse: 'residents', linksMode: true },
    },
  ],
} satisfies ResourceSchema;
```

On a ReactiveResource, a field in LinksMode is always read synchronously: a `belongsTo` returns the
related record (or `null`) and a `hasMany` returns its array, with no promise proxy even when
`async: true`. Declare these fields `async: false`.

### On a ReactiveResource In PolarisMode

The schema is the same without `legacy: true`. PolarisMode only supports the legacy kinds in
LinksMode, and adds constraints:

1. They must use `linksMode: true`; without it, reading the field asserts.
2. They must be `async: false`. Async legacy relationships will not be supported in PolarisMode.
3. There is no autofetch, because the relationships are sync.

Loading a legacy relationship's link is also harder in PolarisMode, because references and their
utility methods are not available:

* a `belongsTo` exposes neither its links nor a `reload` method; working around that takes the
  cache API or a derivation.
* a `hasMany` can be reloaded through its link with `reload`, e.g. `user.friends.reload()`, and its
  links are available as `user.friends.links`.

The legacy kinds are limited in PolarisMode on purpose, so apps can try it on existing schemas.
Relationships that need links or async loading in PolarisMode should use
[`resource` and `collection`](/guides/the-manual/schemas/relational-fields.md) instead; see
[Sync vs Async](./sync-vs-async.md) for what `async` means for them.
