---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/rfcs/0007-virtualized-resources.md
description: >-
  Proposes virtual resource schemas, the frontend equivalent of a materialized
  view, whose fields reflect fields of other cached resources through pointers
  so that data read or written through the view stays consistent everywhere.
---

# Virtualized Resources&#x20;

## Summary

A new category of resource schema, `kind: 'virtual'`, describes a resource that owns no data of
its own. It holds [pointers](/rfcs/0006-pointer-and-reference-fields.md) to other resources and
exposes their fields through a new field kind, `reflection`. When the cache receives a virtual
resource, each reflected value is written into the cache entry of the resource it belongs to;
when the app reads or edits a reflection, it reads or edits that same entry. A virtual resource
is to the frontend what a materialized view is to a database: a recombination of existing data
that never diverges from its sources.

## Motivation

Apps usually model resources one-to-one with the tables behind their API:

```ts
interface User {
  name: string;
  address: Address;
}

interface Address {
  street: string;
  city: string;
  country: string;
}
```

APIs do not always follow suit. An endpoint may return a `user-street` built from both:

```ts
interface UserStreet {
  name: string; // from User
  street: string; // from Address
}
```

Modeled as an ordinary resource, `user-street` is a second, independent copy of `name` and
`street`. When a user edits the street on a `user-street` form, the change is saved and shown
there but not on any `address` rendered elsewhere, and the reverse. The user sees fields they
have seen before, with values that disagree, and correctly concludes the app is broken. Keeping
the copies in sync today means hand-written glue in a handler or in the app.

The same shape appears without any unusual API:

* **Tables** want rows and columns flattened from several resources.
* **Forms** edit a few fields from each of several resources and ignore the rest.
* **Domain abstractions** present a concept that spans storage boundaries as a single thing.

In each case the resources are distinct up to the moment the UI uses them. A virtual resource
codifies that moment in the schema, so WarpDrive can keep one copy of each value and route every
read and write to it.

Virtual resources differ from projections or partials, which present a subset of a *single*
resource's fields under that resource's identity. A virtual resource assembles fields from
*multiple* resources and has an identity of its own.

## Detailed design

### Terminology

* **Virtual resource**: a resource whose schema has `kind: 'virtual'`. Its cache entry stores
  only its identity and its pointers.
* **Source**: a resource a virtual resource points at.
* **Reflection**: a field on a virtual resource that aliases a field on a source.

### Schema

```ts
store.schema.registerResource({
  type: 'user-street',
  kind: 'virtual',
  identity: { kind: '@id', name: 'id' },
  fields: [
    { kind: 'pointer', name: 'theUser', type: 'user' },
    { kind: 'pointer', name: 'theAddress', type: 'address' },
    { kind: 'reflection', name: 'name', source: 'theUser', sourceKey: 'name' },
    { kind: 'reflection', name: 'street', source: 'theAddress', sourceKey: 'street' },
  ],
});
```

A virtual schema is registered like any other resource schema and shares the same type
namespace. It may contain only:

* an identity field;
* `pointer` and `reference` fields (RFC 6), which name the sources;
* `reflection` fields;
* `derived` and `@local` fields, which already store nothing in the cache.

Any other field kind is rejected by DEBUG-time schema validation, as is `legacy: true`. Sources
may be PolarisMode or LegacyMode resources.

### The `reflection` field

```ts
interface ReflectionField {
  kind: 'reflection';
  name: string;
  /** The name of a pointer, reference, or to-one reflection on this schema. */
  source: string;
  /** The name of the field on the source's schema. */
  sourceKey: string;
}
```

A reflection takes on the kind, type, transform, and options of the field it reflects: a
reflection of a `field` with a `date` transform reads as a `Date`, and a reflection of a
relationship reads as that relationship. It cannot reflect an identity field; the source's
identity is available through the pointer.

`source` may name another reflection when that reflection resolves to a to-one relationship.
This lets a payload identify only the root source:

```ts
fields: [
  { kind: 'pointer', name: 'theUser', type: 'user' },
  { kind: 'reflection', name: 'theAddress', source: 'theUser', sourceKey: 'address' },
  { kind: 'reflection', name: 'name', source: 'theUser', sourceKey: 'name' },
  { kind: 'reflection', name: 'street', source: 'theAddress', sourceKey: 'street' },
];
```

Cycles are rejected by schema validation.

### Receiving a virtual resource

The payload is an ordinary resource. Reflected values appear under the reflection's name, and
pointers appear as relationships:

```json
{
  "data": {
    "type": "user-street",
    "id": "1",
    "attributes": { "name": "Chris", "street": "1 Main St" },
    "relationships": {
      "theUser": { "data": { "type": "user", "id": "1" } },
      "theAddress": { "data": { "type": "address", "id": "7" } }
    }
  }
}
```

The cache stores `user-street:1` with only its pointers, then upserts `name` into `user:1` and
`street` into `address:7`, exactly as if those values had arrived on those resources. The usual
upsert rules apply: the newest value wins, and fields the payload omits are left alone. If a
source is not yet in the cache, the write creates a partial entry for it, which satisfies the
pointer's presence check.

Pointers resolve before reflections are routed, so a reflection sourced through another
reflection routes to whichever resource that reflection resolves to after the payload is applied.
A reflected value whose source resolves to `null` has nowhere to go and fails a DEBUG assertion;
in production it is dropped.

Deriving the pointers from the payload is the job of the request handler or serializer, as with
any other relationship.

### Reading

Reading a reflection reads the source's field, so its value and reactivity are the source's:
when `address:7`'s `street` changes from any request, mutation, or other view, every
`user-street` pointing at it updates. When the source is `null`, a reflection reads as
`undefined`. An unloaded pointer target asserts on read as described in RFC 6; an unloaded
reference target makes its reflections read as `undefined`.

`cache.peek(key)` for a virtual resource returns the assembled resource, with reflected values
under `attributes` or `relationships` as appropriate, so serialization needs no special case.

### Editing and saving

An editable virtual record writes each reflection to the source's local state. The change is
visible immediately on every editable view of that source, and `hasChangedAttrs`,
`changedAttrs`, and `rollbackAttrs` on the virtual resource operate on the union of its
reflected fields across its sources. Changes the source has in fields the virtual resource does
not reflect are unaffected.

Saving a virtual resource is an ordinary request built by the app. Committing it
(`willCommit`/`didCommit`/`commitWasRejected`) moves only its reflected fields into and out of
the in-flight state on each source. A response containing the virtual resource is received as
above; validation errors keyed by a reflection's name are reported on the virtual resource and
on the matching source field.

A virtual resource can be created client-side from its pointers, for instance to back a form over
records that are already loaded:

```ts
const form = store.createRecord('user-street', { theUser: user, theAddress: address });
form.street = '2 Main St'; // a local change on `address`
```

Values for reflections passed at creation are written to the sources as local changes.

### Unloading and deletion

Unloading a virtual resource removes only its own entry; sources are untouched. Unloading or
deleting a source follows the pointer and reference semantics of RFC 6. Deleting a virtual
resource is not meaningful on its own and asserts; delete the sources instead.

### Schema DSL

`@warp-drive/schema-dsl` gains a `@Virtual` class decorator and a `@reflection` field decorator.
The generated type of a reflection is the type of the field it reflects.

```ts
import { Virtual, pointer, reflection } from '@warp-drive/schema-dsl';

@Virtual
export class UserStreet {
  @pointer({ type: 'user' })
  declare theUser: User;

  @pointer({ type: 'address' })
  declare theAddress: Address;

  @reflection({ source: 'theUser', sourceKey: 'name' })
  declare name: User['name'];

  @reflection({ source: 'theAddress', sourceKey: 'street' })
  declare street: Address['street'];
}
```

### Dependencies and scope

This RFC depends on the `pointer` and `reference` field kinds from RFC 6. Out of scope:

* form validation. Virtual resources are a natural home for validation that spans resources,
  since they know which fields a form cares about and how they relate, but that belongs in a
  separate RFC;
* deriving pointers declaratively from payload attributes such as `userId`;
* nested reflection paths in a single field (`sourceKey: 'address.street'`).

## How we teach this

The manual's schema section gains a page, *Virtual Resources*, introduced as "materialized views
for your frontend". It opens with the `user-street` example and the bug it prevents, then shows
the two uses most apps will reach for first: a table row and a form. The page emphasizes that a
virtual resource holds no data, so everything true of a source (freshness, dirtiness, unloading)
is true of its reflections. The resource-schema agent skill lists `kind: 'virtual'` and
`reflection`. API docs ship with the implementation.

## Drawbacks

* **Indirection.** A value shown on a virtual record lives elsewhere, which can surprise someone
  debugging it. DevTools should show a reflection's source.
* **Writes fan out.** Receiving one virtual resource mutates several entries, and editing one can
  make several resources dirty.
* **Partial entries.** Routing values into sources that were not otherwise loaded creates entries
  holding only the reflected fields.
* **Field-scoped commits** are new: today a commit applies to a whole entry.
* **Third-party caches** must implement routing, assembly, and field-scoped commits to support
  virtual schemas.

## Alternatives

* **A handler that splits the response** into its source resources and returns them. It keeps
  the cache unchanged but loses the virtual shape: the app must reassemble it for every table row
  or form, and saves must be split by hand.
* **`derived` fields over pointers.** They cover reading, but not receiving reflected data from
  the API or writing through to the source.
* **Extending `alias` to point across resources.** `alias` renames a field within one entry;
  giving it a second meaning muddles both.
* **Projections or partials.** They present a subset of one resource and cannot combine several.
* **Doing nothing.** Apps keep writing sync glue, or live with copies that disagree.

Prior art: database materialized and updatable views, which recombine tables while keeping one
source of truth; normalized GraphQL caches, which store fragments from any query shape under the
identity each field belongs to.

## Unresolved questions

* **`sourceKey` naming.** Elsewhere `sourceKey` names a key in the cache; here it names a field on
  the source schema. A different name, such as `field`, may avoid the overlap.
* **Own stored fields.** Whether a virtual resource may hold fields that belong to no source, such
  as a value the server computes for the view.
* **Partial source entries.** Whether an entry created only by reflection should count as loaded
  for pointers and cache policies, or be marked partial.
* **Identity.** Whether a virtual resource without a server id should derive its identity from its
  pointers so that the same combination always yields the same record.
* **Commit granularity.** Whether field-scoped commits are feasible for every cache, or whether
  committing a virtual resource should commit its sources whole.
