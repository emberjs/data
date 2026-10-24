---
url: https://canary.warp-drive.io/rfcs/0006-pointer-and-reference-fields.md
description: >-
  Proposes four PolarisMode relationship field kinds (pointer, pointer-array,
  reference, reference-array) for relationships WarpDrive never fetches or
  validates for delivery, where pointers assert the related resource is loaded
  and references tolerate its absence.
---

# Pointer and Reference Fields&#x20;

## Summary

PolarisMode gains four relationship field kinds: `pointer`, `pointer-array`, `reference`, and
`reference-array`. They describe a relationship that WarpDrive never fetches through the
relationship itself and whose delivery it does not validate: the related resources may be
sideloaded with the parent, arrive by some other request, or never arrive. A **pointer** promises
the related resource is loaded whenever the field is read, and WarpDrive asserts that in
development builds. A **reference** allows it to be missing: the field yields the related resource
when it is loaded and its `ResourceKey` otherwise. All four are synchronous, have no inverse, and live in the
relationship graph with one difference from other sync relationships: a committed delete of a
related resource removes it from the relationship, but `unloadRecord` does not.

## Motivation

PolarisMode relationships are strict about what their shape promises: a sync relationship must
carry its related resources in the same document, and an async one must carry a link that can
fetch them (see [LinksMode](/guides/the-manual/misc/links-mode.md)). That rule cannot express a
relationship the developer knows will not be satisfied by the delivering document and does not
want WarpDrive to fetch either.

LegacyMode apps declare such relationships as `belongsTo`/`hasMany` with `async: false` because
nothing else exists. They arise when:

* a prior or concurrent request is known to deliver the related records;
* the related resources only ever arrive with the parent and have no endpoint of their own, and
  the parent should own them outright with no inverse and no fetching;
* the app wants only the id, as the legacy References API allowed; or
* a separate system, such as a recommendation service, can name a resource by type and id but
  cannot deliver it or link to it.

Today these degrade silently: a sync relationship returns `null` or a partial array with no
signal that anything is wrong, and the schema gives WarpDrive no way to tell "sideload expected
but missing" from "sideload never expected". The two cases differ in one way, and that difference
is the point:

* A **pointer** presumes the related resource is loaded. Its absence is a programming error.
* A **reference** allows the related resource to be missing. Its absence is a normal state, and
  the identity is useful on its own: to key a placeholder, to fetch, or to compare.

Both overlap with sync `resource`/`collection` by design. While the data is present they behave
identically; they differ in what WarpDrive enforces (full linkage at push time versus presence
at read time) and in what the app promises. Apps choose the contract that fits.

Pointers and references are always synchronous and never have an inverse. Without that rule
every sync/async and inverse/no-inverse permutation would need a pointer and reference variant;
with it, there are four kinds.

### Why distinct kinds rather than an option

* The contract is visible where the schema is read, to people and to the schema DSL's type
  generation, without consulting option semantics.
* The value types differ: a pointer yields `T | null`, a reference yields
  `T | ResourceKey | null`. Separate kinds let the types say so.
* `resource` and `collection` stay strict, with no option that weakens them.

## Detailed design

### Terminology

* **Pointer**: a relationship whose related resources are promised to be loaded whenever the
  field is read.
* **Reference**: a relationship whose related resources may or may not be loaded; the field
  yields each as the resource when loaded and as its identity otherwise.
* **Related identity**: the `{ type, id }` the API delivered for an entry, exposed at runtime as
  a `ResourceKey`.

"Reference" collides with LegacyMode's References API (`belongsToReference()`,
`hasManyReference()`). PolarisMode removes that API, so the term is free there; see
[How we teach this](#how-we-teach-this).

### The four field kinds

The array forms follow the existing `schema-object`/`schema-array` convention.

| Kind              | Cardinality | Value on read                  | Related resource not in the cache                     |
| ----------------- | ----------- | ------------------------------ | ----------------------------------------------------- |
| `pointer`         | to-one      | `T \| null`                    | Assertion in development; `null` in production        |
| `pointer-array`   | to-many     | `readonly T[]`                 | Assertion in development; entry omitted in production |
| `reference`       | to-one      | `T \| ResourceKey \| null`     | The `ResourceKey`                                     |
| `reference-array` | to-many     | `readonly (T \| ResourceKey)[]` | That entry is the `ResourceKey`                       |

All four share one schema shape:

```ts
interface PointerOrReferenceField {
  kind: 'pointer' | 'pointer-array' | 'reference' | 'reference-array';
  name: string;
  sourceKey?: string;
  /** The related resource type, or the trait/abstract type when polymorphic. */
  type: string;
  options?: {
    polymorphic?: boolean;
  };
}
```

There is no `async`, `inverse`, `as`, or `linksMode` option: the kind fixes all of them. A schema
that supplies one is rejected by DEBUG-time schema validation. `polymorphic` behaves as it does
for every other relationship kind.

The kinds are added to `PolarisModeFieldSchema`, `LegacyModeFieldSchema`, and
`CacheableFieldSchema`. They are not valid in an `ObjectSchema`.

### Example

```ts
store.schema.registerResource({
  type: 'post',
  identity: { kind: '@id', name: 'id' },
  fields: [
    { kind: 'field', name: 'title' },
    // the route loads every user and tag before it loads posts
    { kind: 'pointer', name: 'author', type: 'user' },
    { kind: 'pointer-array', name: 'tags', type: 'tag' },
    // a separate commerce API; the product may not be in the cache yet
    { kind: 'reference', name: 'featuredProduct', type: 'product' },
    // a recommendation service that returns ids of things implementing `readable`
    { kind: 'reference-array', name: 'suggestedReads', type: 'readable', options: { polymorphic: true } },
  ],
});
```

The payload is an ordinary JSON:API relationship object with `data`; the schema, not the
document, makes it a pointer or a reference.

```ts
const post = (await store.request(findRecord('post', '1'))).data;

post.author;           // User — asserts in DEBUG if user:7 is not loaded
post.tags;             // readonly Tag[] — asserts in DEBUG if any tag is missing
post.featuredProduct;  // Product | ResourceKey | null
post.suggestedReads.map((read) => (isResourceKey(read) ? read.id : read.title));

// loading a missing reference is an ordinary request
const product = post.featuredProduct;
if (isResourceKey(product)) {
  await store.request(findRecord(product.type, product.id));
}
```

### Unloaded references

A reference yields the related resource when it is loaded and its `ResourceKey` (the stable
`{ type, id, lid }` identity object the store already uses everywhere) otherwise. The field
re-resolves reactively when the resource loads or unloads, so a consumer that re-reads it sees
the switch. Nothing is materialized for an unloaded target, so a loaded reference target can be
unloaded like any other record; the field simply falls back to the key. `isResourceKey`, private
today, becomes a public export of `@warp-drive/core` so consumers can discriminate the two.
Loading is an ordinary request against the key's `type` and `id`.

### Graph semantics

Pointers and references are ordinary graph relationships with implicit inverses, so the graph
prunes a related resource from every pointer and reference that held it when its deletion is
committed, or when a never-persisted record is discarded. A deleted `tag` vanishes from
`post.tags`; a deleted `product` turns `post.featuredProduct` into `null`.

They differ from every other sync relationship in one way. Today, unloading a resource that a
sync relationship holds is treated as a client-side delete and the resource is pruned, since a
sync relationship cannot refetch it. Pointers and references make no promise that the
relationship can deliver the resource, so an unload is an eviction, not a statement about the
relationship: the identity stays in the relationship, the way it does today for async inverses.
An unloaded pointer target therefore asserts on the next read instead of silently disappearing,
and an unloaded reference target keeps its identity available to fetch with.

Because they are graph-backed, the existing relationship `Cache` APIs apply unchanged:
`getRelationship`, the related-records mutation operations, `changedRelationships`,
`rollbackRelationships`, and JSON:API serialization under `relationships`. `meta` and `links` on
the relationship object are preserved but never used to fetch.

Mutation on an editable record accepts:

* for a `pointer`, a record instance or `null`; for a `pointer-array`, record instances. A pointer
  can only be set to something loaded, because a record instance is proof of loading;
* for a `reference` or `reference-array`, a record instance, a bare identity (`{ type, id }` or a
  `ResourceKey`), or `null`; a bare identity reads back as the resource if loaded, else its key.

### Validation

At push time the only check is that the relationship object carries a `data` key; `null` and `[]`
are valid empty values, and a missing or `undefined` `data` is rejected, as it is for linksMode
relationships. Full linkage is not checked. The polymorphic type check applies as for every
relationship kind.

At read time, a `pointer` or `pointer-array` with an unloaded identity fails a DEBUG assertion
naming the resource, the field, and each missing identity:

```
Assertion Failed: post:1 declares `author` as a pointer to user:7, but user:7 is not
loaded. A pointer promises its related resource is already loaded whenever the
field is read. Load user:7 first, or declare `author` as a `reference`
if it may legitimately be absent.
```

In production, where assertions are stripped, a missing pointer target resolves to `null` or is
omitted from the array, the same degraded behaviour a sync `linksMode` `belongsTo` has today. The
check is read-time by design: whatever satisfies a pointer may land after the document that
carries it. References have no read-time assertion.

### Reactivity

Pointers and pointer arrays react to membership changes exactly as the current linksMode
`belongsTo` and `hasMany` do. A reference field additionally notifies when one of its targets
loads or unloads, since its value switches between key and record. Immutable and editable record
instances render remote and local relationship state
respectively, as for every other field.

### Availability in LegacyMode

The kinds are mode-independent, like `schema-array`, and are valid in `legacy: true` schemas.
This gives a migration path: an app can re-declare a `@hasMany('tag', { async: false, inverse:
null })` that was really a pointer as `{ kind: 'pointer-array', name: 'tags', type: 'tag' }`
while still in LegacyMode, get the presence assertion immediately, and sort its sync
relationships into pointers and references before switching modes. `Model` gains no decorator for
them; a `Model`-based app adopts them by moving the resource to a `legacy: true` schema.

### Schema DSL

`@warp-drive/schema-dsl` gains `@pointer`, `@pointerArray`, `@reference`, and `@referenceArray`,
each accepting `type`, `polymorphic`, and `sourceKey`:

```ts
import { Resource, field, pointer, pointerArray, reference, referenceArray } from '@warp-drive/schema-dsl';

@Resource
export class Post {
  @field declare title: string;

  @pointer({ type: 'user' })
  declare author: User | null;

  @pointerArray({ type: 'tag' })
  declare tags: readonly Tag[];

  @reference({ type: 'product' })
  declare featuredProduct: Product | ResourceKey | null;

  @referenceArray({ type: 'readable', polymorphic: true })
  declare suggestedReads: readonly (Readable | ResourceKey)[];
}
```

The generated read, create, and edit types follow the value table; the edit view of a reference
also accepts a bare identity on assignment.

### Out of scope

* The `resource` and `collection` fields. Pointers and references are independent of them and
  can land in either order.
* Paginated collections.
* Any fetching behaviour.
* Deprecating the existing sync `linksMode` `belongsTo`/`hasMany` support in PolarisMode.

## How we teach this

The manual's schema section gains a page on PolarisMode relationships framed around what each
kind guarantees:

* **WarpDrive delivers it**, sideloaded when sync or fetched by link when async: `resource` /
  `collection`.
* **I guarantee it is loaded, however it got here**: `pointer` / `pointer-array`.
* **It may or may not be loaded; here is who it would be**: `reference` / `reference-array`.

The mnemonic: *a pointer is a promise, a reference is a hint.* The page shows each kind's failure
mode (the pointer assertion, a reference rendering a placeholder from its `id`), notes that a sync `resource` and a `pointer` overlap on purpose, and states that a
PolarisMode `reference` field is a kind of relationship, not LegacyMode's References API for
inspecting and fetching one. The LinksMode guide's "What To Expect" section places pointers and
references next to the planned `resource`/`collection` shapes, and the resource-schema agent
skill lists the four kinds. API docs ship with the implementation. A lint rule or codemod that
flags `async: false, inverse: null` legacy relationships as candidates is out of scope.

## Drawbacks

* **Four more field kinds**, though they map onto two concepts and an existing array convention.
* **Two value shapes.** A reference is a record or a `ResourceKey`, so every read discriminates,
  and the value changes identity when the target loads, so holders must re-read the field.
* **"Reference" is overloaded** while LegacyMode's References API exists.
* **Pointer failures surface at read time**, later than PolarisMode's other relationship checks.
  A pointer that is never read never fails, and one read only on an untested path fails silently
  in production.
* **Unload and delete diverge** for these kinds only, a new distinction to learn.
* **Third-party caches** that manage relationships without the core graph must implement the
  same unload and delete rule.

## Alternatives

* **An option on `resource`/`collection`**, such as `options: { loaded: 'optional' }`. Rejected:
  it hides the contract in option semantics, weakens the strict kinds, and makes a value type
  depend on an option.
* **Reusing `belongsTo`/`hasMany` with a `strict` flag.** Rejected: it perpetuates fields
  PolarisMode is moving away from and reduces the pointer/reference distinction to a boolean.
* **A `{ key, data }` wrapper for references**, with `data` null until loaded. Keeps the value
  stable across loading, but adds a second value shape and a `.data` hop on every read.
* **Always the resource**, with only `$type` and `id` available until loaded. Rejected: an
  unloaded target would need a materialized record with no data, which `unloadRecord` could not
  release without breaking the reference.
* **Cardinality as an option** (`options: { many: true }`). Rejected: every other field kind
  encodes cardinality in the kind.
* **Storing outside the graph.** Considered first, since these fields need no inverse and no
  fetching. Rejected: it forfeits pruning on delete and hides pointers from `getRelationship`,
  `changedRelationships`, relationship notifications, and the graph explorer in
  [RFC 3](/rfcs/0003-warp-drive-devtools-extension.md).
* **Treating unload as a client-side delete**, as sync relationships do today. Rejected: it masks
  the broken promises pointers exist to expose and discards the identity references exist to
  preserve.
* **Doing nothing.** Apps would have to sideload or link every relationship before adopting
  PolarisMode, which is why relationships block #10408 today.

Prior art: [MobX-State-Tree](https://mobx-state-tree.js.org/concepts/references) draws the same
line with `types.reference` (throws when the target is missing) and `types.safeReference`
(resolves to `undefined`). Normalized GraphQL caches store every relationship by identity and
resolve at read time, but do not distinguish promised from optional presence in the schema.

## Unresolved questions

* **Discriminating the union.** A public `isResourceKey` guard is proposed; a brand on
  `ResourceKey` or a `$state`-style flag on records could replace or complement it.
* **Whether the array kinds expose `meta` and `links`**, as `ManyArray` does today.
* **Kind names.** `-array` suffixes versus plurals, or a different base word for either concept.
* **A missing pointer target in a production `pointer-array`.** Omit the entry (proposed) or leave
  a `null` hole so the length reflects membership.
* **Whether LegacyMode availability should be feature-gated** until the PolarisMode relationship
  story is complete.
* **Sequencing.** #10408 proposes the `resource`/`collection` kinds first and these four after;
  this RFC is independent so the order can follow implementation readiness.
