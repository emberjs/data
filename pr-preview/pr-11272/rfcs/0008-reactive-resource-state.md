---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/rfcs/0008-reactive-resource-state.md
description: >-
  Proposes adding a reactive, read-only $state field to the PolarisMode defaults
  that reports a resource's lifecycle state (new, empty, deleted, dirty) and its
  per-field local changes, replacing the LegacyMode state flags that still apply
  and dropping the ones that don't.
---

# A `$state` Field for PolarisMode ReactiveResources&#x20;

## Summary

`withDefaults` from `@warp-drive/core/reactive` adds a new derived field, `$state`, to every
PolarisMode resource schema it builds, and `registerDerivations` registers the `@state`
derivation that backs it. `$state` is a stable, read-only, reactive object describing the
resource's lifecycle in the cache, and which of its fields have local changes:

```ts
interface ReactiveResourceState {
  readonly isNew: boolean;
  readonly isEmpty: boolean;
  readonly isDeleted: boolean;
  readonly isDeletionCommitted: boolean;
  readonly isDirty: boolean;
  readonly changes: Readonly<Record<string, ResourceFieldChange | undefined>>;
}
```

It is the PolarisMode counterpart to the state flags LegacyMode puts directly on a record
(`isNew`, `isEmpty`, `isDeleted`, `hasDirtyAttributes`, `changedAttributes()`, ...), keeping the
ones that describe the resource itself, cleaning up their names and return types, and dropping
the ones that describe a request or an EmberObject lifecycle instead.

## Motivation

A PolarisMode resource built with `withDefaults` today exposes its identity (`id`, `$key`,
`$type`) and its data, but nothing about its lifecycle. To answer "is this record new?", "does it
have unsaved changes?" or "which fields did the user change?" an app has to reach past the
resource into the cache:

```ts
const key = recordIdentifierFor(user);
const isNew = store.cache.isNew(key);
const isDirty = store.cache.hasChangedAttrs(key) || store.cache.hasChangedRelationships(key);
const nameChange = store.cache.changedAttrs(key).name;
```

None of those reads are reactive: the cache is not a signal-backed structure, so a template or
component that reads them will not update when the value changes. Getting reactivity means
subscribing to the `NotificationManager` by hand and managing that subscription's lifetime,
which is exactly the machinery `RecordState` already implements for LegacyMode.

This gap shows up as soon as an app migrates from `Model` (or LegacyMode schemas) to PolarisMode.
Every edit form needs "has unsaved changes" and usually "this field was changed" indicators, and
every one of them is currently re-implementing it, usually without reactivity or without
cleaning up its subscriptions.

The goal is for the canonical PolarisMode resource to answer those questions itself, reactively,
without adding a second, parallel copy of LegacyMode's flag soup to it.

## Detailed design

### The field

`withDefaults` appends one field to the schema:

```ts
{ kind: 'derived', name: '$state', type: '@state' }
```

`registerDerivations` registers the `@state` derivation alongside the existing `@identity` and
`@constructor` derivations. `useRecommendedStore` already calls `registerDerivations`, so apps
using it get `$state` with no further setup.

It is named with a `$` prefix for the same reason `$type` and `$key` are: it is metadata about the
resource rather than data from it, and the prefix keeps it from colliding with a real field named
`state` (a common attribute name in its own right — an order's `state`, a US `state`).

`$state` is:

* **Stable.** `record.$state === record.$state`. The derivation creates the state object once per
  record instance and memoizes it; its properties are what change.
* **Read-only.** Setting `$state` or any of its properties is an error, the same as any derived
  field.
* **Non-enumerable.** It is excluded from `Object.keys(record)`, `{ ...record }`, and
  `JSON.stringify(record)`, the same as `constructor`, so adding it to `withDefaults` doesn't
  change what apps that serialize or spread records get. `$state` itself implements `toJSON` for
  debugging.
* **Only on resources.** `withDefaults` only builds resource schemas; embedded objects
  (`schema-object`, `schema-array` members) have no lifecycle of their own and don't get `$state`.
* **Only about the cache.** Every property is derived from the cache's state for the resource.
  `$state` has no knowledge of requests; see [Request state](#request-state).

### Properties

| Property | Source | Invalidated by |
| --- | --- | --- |
| `isNew` | `cache.isNew(key)` | `'state'` notifications |
| `isEmpty` | `!cache.isNew(key) && cache.isEmpty(key)` | `'state'`, `'attributes'` notifications, and record teardown |
| `isDeleted` | `cache.isDeleted(key)` | `'state'` notifications |
| `isDeletionCommitted` | `cache.isDeletionCommitted(key)` | `'state'` notifications |
| `isDirty` | see below | `'state'`, `'attributes'`, `'relationships'` notifications, both channels |
| `changes` | `cache.changedAttrs(key)` / `cache.changedRelationships(key)`, per field | see [Per-field changes](#per-field-changes) |

Every read is computed fresh from the cache; the notifications only invalidate reactive
consumers so that they re-read. Store notifications are delivered in batches, so caching a value
until its notification arrives would make a read immediately after an edit
(`editable.name = 'x'; editable.$state.isDirty`) return the stale value. Computing on read avoids
that, and every property is a cheap cache lookup.

`isDirty` is the LegacyMode `isDirty` computation, extended to relationships:

```ts
if (isDeletionCommitted || (isDeleted && isNew)) return false;
return isDeleted || isNew || cache.hasChangedAttrs(key) || cache.hasChangedRelationships(key);
```

A new resource deleted before it was ever saved, and a resource whose deletion has been
committed, have nothing left to persist, so they are not dirty.

`isDirty` and `changes` listen to both the `'local'` and `'remote'` notification channels. A local
edit changes the local projection, but a remote update whose value matches a pending local edit
resolves that edit while changing only the remote projection; listening to one channel would miss
one of the two.

#### `isEmpty`

`isEmpty` reports exactly what the cache reports: it is `!cache.isNew(key) && cache.isEmpty(key)`.
A new resource is never empty, matching LegacyMode. `$state` does not redefine what "empty"
means; for the JSON:API cache, it means the resource has no field data at all.

For a PolarisMode instance, that is most visible when a resource is **removed from the store
while still referenced**. `store.unloadRecord` tears the record instance down *before* the cache
releases the resource's data, so by the time the data is gone nothing is subscribed to hear about
it. To cover that, tearing down a record invalidates `isEmpty`, so a template still rendering the
unloaded record re-reads it and sees `true`.

Whether `isEmpty` should also cover a resource that was *loaded* without any field values, a case
that is becoming more common now that partial fields are supported, is deliberately left for a
later time; see Unresolved questions.

#### Per-field changes

`changes` is an object keyed by field name. A field with local changes has an entry; a field
without them does not:

```ts
editable.name = 'Christopher';

user.$state.changes.name;
// => { kind: 'field', remoteState: 'Chris', localState: 'Christopher' }

user.$state.changes.age;
// => undefined

Object.keys(user.$state.changes);
// => ['name']
```

An entry is a `ResourceFieldChange`:

```ts
type ResourceFieldChange = FieldChange | RelationshipDiff;

interface FieldChange {
  kind: 'field';
  remoteState: Value | undefined;
  localState: Value;
}
```

* A **non-relationship field** (`field`, `array`, `object`, `schema-object`, `schema-array`)
  produces a `FieldChange`, built from the cache's `changedAttrs` entry for that field. Its
  `remoteState`/`localState` naming matches `RelationshipDiff`, so the two read the same way.
  Values are in the form the cache stores them, before any `Transformation` is applied.
* A **relationship** (`belongsTo`, `hasMany`, `resource`, `collection`) produces the cache's
  existing `RelationshipDiff` for that field: `kind: 'resource'` for to-one, with
  `remoteState`/`localState` keys, and `kind: 'collection'` for to-many, with `additions`,
  `removals` and `reordered` as well.
* Identity, `derived`, `alias` and `@local` fields hold no cache data of their own and never
  have an entry.

Entries are keyed by the field's name, not its `sourceKey`, and nested changes (inside an
`object` or `schema-object` field) are reported on the top-level field that contains them.

Each entry is reactive **on its own**. Reading `changes.name` consumes a signal for `name` only,
which is invalidated by an `'attributes'` notification for `name`'s cache key (or a path starting
with it), so a component rendering the `name` input's "changed" indicator does not re-render when
`age` changes. Reading the set of keys (`Object.keys`, `in` on an unchanged field, iterating)
consumes a signal invalidated by a change to any field. A `'state'` notification (commit,
rollback) and a keyless notification invalidate every entry.

#### Both projections share one state

A PolarisMode resource has two projections: the immutable instance and its editable checkout.
`$state` describes the *resource in the cache*, not a projection, so both report the same values:
after `editable.name = 'Christopher'`, `user.$state.isDirty` is `true` and `user.$state.changes.name`
is populated on the immutable instance too. This is deliberate. The question "does this resource
have unsaved changes" has one answer, and the immutable instance is usually what the rest of the
UI (a list row, a nav badge) is rendering when it wants to show that answer. The immutable
instance still does not *show* the edited values in its fields, only that changes exist.

### Request state

`$state` deliberately has no request-derived properties: no `isSaving`, `isError`, `error`,
`errors` or `isValid`. Those describe a request, not the resource, and PolarisMode already makes
requests reactive: `getRequestState(future)` and the `<Request>` component report whether a save
is pending, whether it failed and with what error. Keeping them out of `$state`:

* keeps `$state` a pure projection of the cache, with no dependency on the `RequestStateService`,
  whose record tracking only registers the first entry of `request.records` for a mutation;
* avoids a resource-level summary of requests that is ambiguous when several requests touch the
  same resource at once;
* leaves validation errors, which arrive as the rejection of a save request, with that request.
  The cache still stores them per resource and `cache.getErrors(key)` still returns them; see
  Unresolved questions for surfacing them per field.

### Lifetime

The state object subscribes to the `NotificationManager` for its resource the first time `$state`
is read, and unsubscribes when the record is torn down: the same point at which the record's own
notification subscription is released, including the editable checkout when its immutable
instance is torn down. A record whose `$state` is never read pays nothing for it.

### What is not carried over, and why

| LegacyMode | In `$state` | Why |
| --- | --- | --- |
| `isNew` | `isNew` | unchanged |
| `isEmpty` | `isEmpty` | unchanged; also becomes `true` when a still-referenced record is unloaded |
| `isDeleted` | `isDeleted` | unchanged |
| `currentState.isDeletionCommitted` / `isSaved` for deletes | `isDeletionCommitted` | the only part of `isSaved` that isn't already `!isDirty` |
| `hasDirtyAttributes`, `currentState.isDirty` | `isDirty` | one name instead of two, and it includes relationship changes |
| `changedAttributes()` | `changes` | reactive, per field, and includes relationships |
| `isSaving`, `isError`, `adapterError` | — | request state; use `getRequestState` / `<Request>` for the save request |
| `errors`, `isValid` | — | validation errors arrive with the rejected request; `cache.getErrors(key)` remains |
| `isLoading`, `isLoaded`, `isReloading`, `isPreloaded` | — | a PolarisMode resource is materialized from cache data; loading is a property of a *request* |
| `dirtyType`, `currentState.stateName` | — | string-encoded restatements of the booleans above; `stateName` exposes the long-gone state machine |
| `currentState` | — | `$state` *is* the state; there's no separate state machine object to reach into |
| `isDestroying`, `isDestroyed` | — | intentionally omitted; see [Removal from the store](#removal-from-the-store) |

### Removal from the store

LegacyMode records expose `isDestroying` and `isDestroyed` from their EmberObject lifecycle, and
apps use them to tell that a record they still hold has been unloaded. `$state` intentionally
omits both.

Those flags exist to support record-based save and loading patterns: calling `record.save()`,
`record.reload()` or `record.destroyRecord()` on an instance, and guarding against a record that
was torn down while one of those calls, or the UI around it, still held it. Record-based saving
and loading are not part of PolarisMode. Resources are loaded and saved through requests, and it
is the request (via `getRequestState` / `<Request>`) that reports whether it is pending, succeeded
or failed. In a request-based paradigm, a destroy flag is much less necessary.

For the cases that remain, `$state` already reports what can be observed. When a PolarisMode
record leaves the store:

1. `store.unloadRecord` (or `unloadAll`, or deleting a new record) calls the store's
   `teardownRecord` hook, which destroys the record instance synchronously and releases its
   notification subscriptions, including `$state`'s.
2. The cache then releases the resource's data.
3. The store stops returning that instance. If the same resource is loaded again, it gets a
   *new* instance; the old one stays disconnected.

A UI still rendering the torn-down instance sees `$state.isEmpty` become `true` (see
[`isEmpty`](#isempty)). Teardown is a single synchronous step, so there is no observable
"destroying" phase that an `isDestroying` flag could report. A successful delete does not by
itself unload the resource; the instance stays materialized with `isDeletionCommitted: true`,
which is the flag for "this is gone on the server".

If we find that a utility for detecting a disconnected instance is still useful, for example an
`isDestroyed` flag set at teardown that stays `true` even after the same resource is re-loaded
into a new instance, one will be added at a later time.

### TypeScript

`ReactiveResourceState`, `ResourceFieldChange` and `FieldChange` are exported as types from
`@warp-drive/core/reactive`. Apps that type their resources by hand add `$state` the same way they
add `$type`:

```ts
import type { ReactiveResourceState } from '@warp-drive/core/reactive';

interface User {
  readonly id: string;
  readonly $type: 'user';
  readonly $state: ReactiveResourceState;
  readonly name: string;
}
```

Apps that generate types from their schemas (e.g. via the schema DSL) should get it from the same
generator that emits `$type`. A generator could also narrow `changes` to the resource's own field
names; see Unresolved questions.

### Compatibility

`$state` is additive. Schemas not built with `withDefaults` are unaffected; schemas that are gain a
field that is non-enumerable and so does not change serialization, spreading or `Object.keys`. A
schema passed to `withDefaults` that already declares its own field named `$state` would now
collide with the added one; see Unresolved questions.

LegacyMode schemas (built with `withDefaults` from `@warp-drive/legacy/model/migration-support`)
are unchanged and keep their flat flags. `$state` is not added to them, so a resource migrating
from LegacyMode to PolarisMode moves from `record.isNew` to `record.$state.isNew` in the same
change that moves its schema. The table above is mechanical enough for the migration codemods to
rewrite those reads, except for the request-state rows, which need the save request's state
instead.

### Ecosystem

* **Lint rules:** none required. A rule flagging LegacyMode flag reads (`record.isNew`,
  `record.hasDirtyAttributes`) on PolarisMode resources would be a useful follow-up to the
  migration codemods.
* **DevTools / Inspector:** `$state.toJSON()` gives devtools a cheap, serializable summary of a
  resource's lifecycle, including the names of its changed fields, to show alongside its data.
* **SSR:** no impact; `$state` holds no data that isn't already in the cache, so nothing extra
  needs to be serialized or rehydrated.

## How we teach this

`$state` is taught as part of `withDefaults`: the `@warp-drive/core/reactive` module docs'
"Utilities" section already describes what `withDefaults` adds (identity and `$type`), and
`$state` joins it with a short example and a link to the `ReactiveResourceState` API page, which
documents each property.

The guides on editing resources are where it becomes useful: an edit form that shows a "you have
unsaved changes" prompt from `$state.isDirty`, marks each changed input from
`$state.changes[field]` without re-rendering the whole form, and takes its saving and error state
from the save request.

For users migrating from `Model`, the upgrade guide gains the "What is not carried over" table
from this RFC, framed as "if you used X, use Y", with the request-state and loading-state rows
pointing to `getRequestState` and the `<Request>` component.

The terminology deliberately matches LegacyMode wherever the meaning is unchanged, so an existing
user's vocabulary carries over; the only rename (`hasDirtyAttributes` → `isDirty`) is one where
the old name was both redundant and incomplete.

## Drawbacks

* **One more field on every PolarisMode resource.** It is lazy and non-enumerable, so the cost is
  a schema entry until someone reads it, but it does become part of the default shape we have to
  support.
* **`$state` reports the resource, not the projection.** An app that expected the immutable
  instance to be "clean" while its checkout is being edited will be surprised. We think the shared
  answer is the more useful one, but it is a choice.
* **Saving and error state moves to the request.** Apps that relied on reading `isSaving` or
  `errors` off the record from anywhere in the UI now need the save request's state, which is
  only available where the request was issued or passed.
* **`changes` reports cache values, not field values.** A field with a `Transformation` reports the
  serialized form (`'2026-09-25'`, not a `Date`), because that is what the cache stores and diffs.
* **A second vocabulary during migration.** Apps midway through moving from LegacyMode will read
  `record.isNew` on some resources and `record.$state.isNew` on others.

## Alternatives

* **Flat flags, as LegacyMode does.** Putting `isNew`, `isDirty`, ... directly on the resource
  would make migration a no-op for reads, but it spends many names in the resource's own
  namespace, collides with real attributes of the same names, and conflicts with PolarisMode's
  `$`-prefixed convention for metadata.
* **A standalone function, e.g. `getResourceState(record)`.** This mirrors `getRequestState` and
  needs no schema field, so it would also work for schemas not built with `withDefaults`. It is
  less discoverable, doesn't show up in the resource's type, and still needs somewhere to keep the
  per-record state and subscription alive. It remains a reasonable addition *on top of* `$state`
  (backed by the same object), if schemas that opt out of `withDefaults` need it.
* **`changes` as a list of changed field names, or a boolean per field.** Simpler to type, but an
  edit form usually wants the original value too ("was: Chris"), and the cache already computes it.
* **`changes` with hydrated (transformed) values.** Friendlier for fields with transformations, but
  it would run every transformation's `hydrate` on every read and diverge from what the cache
  reports through `changedAttrs`.
* **Reuse `RecordState` from `@warp-drive/legacy`.** It would bring the `Errors` `ArrayProxy`,
  `stateName`, and the request and loading flags along with it, and would make `@warp-drive/core`
  depend on `@warp-drive/legacy`.
* **Do nothing.** Apps keep re-deriving these flags from the cache, usually without reactivity and
  without releasing their subscriptions.

## Unresolved questions

* **What `isEmpty` means for a resource loaded with an empty payload (deferred).** This RFC leaves
  `isEmpty` as the cache reports it. The JSON:API cache's `isEmpty` is `true` only when the
  resource has never received field data; a payload of just `{ type, id }` stores an empty set of
  attributes, so `isEmpty` reports `false` for it. Whether such a resource, which partial fields
  make more common, should count as empty may be an unresolved question to revisit at a later
  time. Changing it would mean changing the cache's `isEmpty`, which the store's `peekRecord` also
  uses to decide whether a resource is loaded.
* **Per-field validation errors.** Should the cache's per-resource errors be surfaced per field,
  alongside `changes` (e.g. `$state.errors[field]`), now that request-level `errors` / `isValid`
  are out of `$state`?
* **`changes` for `alias` fields.** An `alias` reads another field's cache data; should
  `changes[alias]` mirror the entry for the field it aliases?
* **Typing `changes`.** Should `ReactiveResourceState` take the resource type as a parameter, so
  `changes` is keyed by the resource's own field names and each entry narrows to `FieldChange` or
  `RelationshipDiff` by field kind?
* Should `withDefaults` assert in development when a schema already declares a field named
  `$state` (or `$type`, `$key`), rather than silently overriding it?
* Should `$state` be added to LegacyMode schemas as well, so that migrating code can switch to
  `$state` before the schema itself moves to PolarisMode?
