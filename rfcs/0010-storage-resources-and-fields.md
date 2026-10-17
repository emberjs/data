---
title: Storage Resources and Storage Fields
description: Proposes resource schemas whose data is sourced from browser storage (localStorage, sessionStorage, or the Cache API) instead of an API, and a storage field kind that persists a single field on-device under a key derived from its host resource's identity.
warp-drive-rfc: 10
emberjs-rfc:
emberjs-pr:
emberjs-branch:
sync-hash:
stage: proposed
start-date: 2026-09-26T00:00:00.000Z
release-date:
release-versions:
teams:
  - data
  - learning
  - typescript
prs:
  accepted:
project-link:
suite:
---

# Storage Resources and Storage Fields

## Summary

Two schema features let WarpDrive source data from browser storage rather than from an API:

- A **storage resource** is a resource schema with a `storage` option. Requests for it are
  fulfilled from `localStorage`, `sessionStorage`, or the
  [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) by a `StorageHandler`, and
  changes made in other tabs, or by anything else that writes to that storage, flow into the cache
  as updates.
- A **storage field** is a new field kind, `storage`, on any resource. Its value is kept in
  browser storage, under a key derived from the identity of the resource it belongs to, and never
  in the cache or in requests to the server.

Both build on the reactive storage primitives proven out in the
[Storage Resources experiment](/guides/the-manual/experiments/storage-resources.md)
(`@warp-drive/experiments/storage`), bringing them into the schema system.

## Motivation

**Building before the API exists.** Frontend work, and increasingly agent-driven work, often
starts before an endpoint is available. Today that means fixtures, a mock server, or code that
gets rewritten once the API arrives. If a schema can say "this resource lives in storage", the app
can be written against the same builders, `store.request` calls, and edit and save flows it will
use in production. When the API ships, removing `storage` from the schema is the only change the
app itself needs.

**On-device data that syncs across tabs.** Drafts, preferences, recently viewed items, and
per-record UI state (a collapsed panel, a chosen tab) belong to the device, not the server. The
experiment showed that reactive, cross-tab-synced storage is valuable, but its decorators work on
arbitrary classes, outside the cache. That leaves such data out of schemas, DevTools, derived
fields, and relationships, and means a per-record preference needs its own class and hand-built
key.

**Reactive state from application state sources.** Storage is shared state. Another tab, a
service worker writing to the Cache API, or code outside WarpDrive can all change it. When storage
is the source of truth for a resource or field, WarpDrive reflects those changes reactively
without the app subscribing to storage events itself.

## Detailed design

### Terminology

- **Storage area**: where a value is kept. One of `'local'` (`localStorage`), `'session'`
  (`sessionStorage`), or `'cache'` (the Cache API, partitioned by an optional `namespace`).
- **Storage resource**: a resource whose schema declares a storage area. Its data is sourced from
  that area.
- **Storage field**: a field of kind `storage`. Its value is sourced from a storage area, keyed by
  its host resource's identity.

### Storage resources

A resource schema opts in with `storage`:

```ts
store.schema.registerResource({
  type: 'draft-invoice',
  identity: { kind: '@id', name: 'id' },
  storage: { area: 'local' },
  fields: [
    { kind: 'field', name: 'title' },
    { kind: 'field', name: 'total', type: 'currency' },
    { kind: 'belongsTo', name: 'customer', type: 'customer', options: { async: false, inverse: null } },
  ],
});
```

```ts
interface StorageOptions {
  area: 'local' | 'session' | 'cache';
  /** Cache area only. Partitions entries into a separate Cache. */
  namespace?: string;
}
```

Everything else about the schema is unchanged: it has the same field kinds, is read through the
same `ReactiveResource`, and is typed the same way. Relationships are stored as resource
identifiers and may point at storage or remote resources.

#### Fulfilling requests

`StorageHandler` is added to the request manager ahead of the app's network handlers:

```ts
import { StorageHandler } from '@warp-drive/utilities/storage';

manager.use([new StorageHandler(), Fetch]);
```

It fulfills any request built by the standard builders whose `op` targets a storage resource type
and passes every other request on. Responses are JSON:API documents, so the cache processes them
exactly as it would a server response.

| `op` | Behavior |
| --- | --- |
| `findRecord` | Returns the stored resource, or a 404 error when there is none. |
| `query` | Returns every stored resource of the type. Filtering, sorting, and pagination are out of scope. |
| `createRecord` | Stores the resource, assigning an id with `crypto.randomUUID()` when it has none. |
| `updateRecord` | Stores the resource. |
| `deleteRecord` | Removes the resource and its storage fields. |

A singleton, such as a site-wide theme, is a storage resource with a fixed id.

#### Storage keys

A storage resource is stored as one entry holding its resource object, under
`persisted:{type}:{id}`. This extends the experiment's `persisted:{resourceKey}:{fieldName}`
format, with `{type}:{id}` as the resource key, and is guaranteed so that other code can read or
write it directly.

#### Changes from outside the tab

When a stored resource changes in another tab, or through a write this tab did not make, WarpDrive
applies the new value to the cache as a remote update, the same as if it had arrived in a
response. When its entry is removed, the resource is unloaded. For the Cache API, the
experiment's `BroadcastChannel` relay provides the events that `localStorage` gets natively;
`sessionStorage` is per-tab and never changes from outside.

### Storage fields

```ts
interface StorageField {
  kind: 'storage';
  name: string;
  area: 'local' | 'session' | 'cache';
  /** Cache area only. */
  namespace?: string;
  /** A registered transformation, applied as for `field`. */
  type?: string;
  options?: {
    /** Used when storage holds no value for this field. */
    defaultValue?: Value;
  };
}
```

```ts
store.schema.registerResource({
  type: 'invoice',
  identity: { kind: '@id', name: 'id' },
  fields: [
    { kind: 'field', name: 'title' },
    { kind: 'storage', name: 'isCollapsed', area: 'local', options: { defaultValue: false } },
    { kind: 'storage', name: 'activeTab', area: 'session', options: { defaultValue: 'summary' } },
  ],
});
```

A storage field is allowed on PolarisMode and LegacyMode resources, including storage resources,
where it keeps one field outside the resource's entry (for example, a session-only field on a
`local` resource, as the experiment's `@field('session')` override did).

- **Key.** `persisted:{type}:{id}:{name}`, using the host's type and id. Every instance of the
  same resource, in every tab, shares the value; different resources of the same type do not.
- **Isolation from the cache.** The value is not stored in the cache, not included in
  `cache.peek`, not serialized into requests, and not affected by responses. Like `@local`, it
  never reaches the server.
- **Reactivity.** Reads are reactive. Writes and changes from other tabs notify the field alone.
- **Values** are serialized with the field's transformation, if any, then `JSON.stringify`. As in
  the experiment, object values are replaced whole, not deep-tracked.
- **New resources.** A resource with no id yet has no stable key. Its storage fields are held in
  memory and written to storage once it receives an id.
- **Removal.** Unloading a resource leaves its storage fields in place. Committing a deletion
  removes them.

### Save semantics (open)

What a write to a storage resource or storage field does before a save is the main open question.
There are two candidates:

**A. Automatic save, one key.** A write goes straight to storage. There is no unsaved state:
`$state` (RFC 8) never reports changes, rollback does nothing, and other tabs see the write
immediately. This is how the experiment and `@local` behave, and it suits on-device state such as
preferences and UI flags.

**B. Lifecycle, two keys.** Storage stands in for the server. The resource entry (or field key)
holds only saved values; edits are local changes in the cache, reported by `$state`, discarded by
rollback, and written to storage only when saved (by a `createRecord`/`updateRecord` request for a
resource, or the host's successful commit for a field). Unsaved edits are also kept under a second
key, `persisted-edits:{type}:{id}` or `persisted-edits:{type}:{id}:{name}`, so that they survive a
reload. This suits the build-before-the-API case, since the app exercises the same save, rollback,
and error handling it will use against a real API.

The two differ in:

- **Fidelity to remote resources.** B matches remote resources; A does not, so code written
  against A can break when the resource moves to an API.
- **Cross-tab behavior.** Under A, tabs converge immediately. Under B, other tabs see only saved
  values; if unsaved edits are kept under the second key, two tabs editing the same resource share
  one set of edits.
- **Complexity.** A is a single key. B keeps two entries per value and must decide how saved and
  unsaved values are merged on load.

The author leans toward B for storage resources, whose purpose is to stand in for remote data, and
A for storage fields, which hold on-device state that has no server counterpart. Either behavior
could also be an option (`save: 'auto' | 'lifecycle'`) with those defaults. Whether B should keep
unsaved edits under the second key at all, or hold them in memory as remote resources do, is part
of the same question.

### Cache API readiness

`localStorage` and `sessionStorage` are synchronous. The Cache API is not, and must be loaded
before its values can be read synchronously. `StorageHandler` waits for it before fulfilling a
request. For storage fields, the app opens the namespace before rendering data that uses it:

```ts
await store.storage.open('cache', namespace);
```

Reading a `cache` storage field before its namespace is open returns the default value and fails a
DEBUG assertion.

### Configuration and unavailable storage

The experiment's options (`fallbackToMemory`, `updateOnQuotaExceeded`, `onQuotaExceeded`) carry
over. When storage is unavailable, such as during server-side rendering or in some private
browsing modes, storage resources and fields fall back to memory if `fallbackToMemory` is set, and
otherwise fail requests and read as their default value.

### Schema DSL

`@warp-drive/schema-dsl` gains a `storage` option on resource decorators and a `@storage` field
decorator. The type of a storage field is its declared type.

```ts
import { Resource, field, storage } from '@warp-drive/schema-dsl';

@Resource({ storage: { area: 'local' } })
export class DraftInvoice {
  @field declare title: string;
}

@Resource
export class Invoice {
  @field declare title: string;

  @storage({ area: 'local', defaultValue: false })
  declare isCollapsed: boolean;
}
```

### Relationship to the experiment

The reactive storage wrappers and `CacheStorage` graduate from `@warp-drive/experiments/storage`
to a stable entrypoint and back both features. The experiment's class decorators (`LocalResource`,
`SessionResource`, `CacheResource`, `field`, `effect`, `param`) stay in the experiments package for
state that lives on arbitrary classes rather than in the cache. Equivalents of `@effect` and
`@param` for schemas are out of scope.

## How we teach this

The manual's schema section gains a page, *Storage Resources and Fields*, with two parts:

- *Prototyping without an API*: define a schema with `storage`, build the feature against the
  standard builders, then remove `storage` when the endpoint ships.
- *Keeping state on the device*: storage fields for per-record UI state and preferences, and how
  they sync across tabs.

The page states plainly that stored data is readable by any script on the origin, is not a secure
place for secrets, and is not a durable database. The experiment's guide links to the new page for
schema-based use. The resource-schema agent skill lists the `storage` option and field kind, so
agents building a feature ahead of its API reach for it. API docs ship with the implementation.

## Drawbacks

- **Stale shapes.** Stored data outlives deploys. A schema change can leave entries whose shape no
  longer matches, and this RFC offers no migration mechanism.
- **Quota and performance.** `localStorage` is small and synchronous; a large `query` over it
  blocks the main thread. The Cache API is larger but asynchronous, which adds a readiness step.
- **Another source of truth.** Storage fields are outside the cache and the request lifecycle, so
  they do not appear in `$state`, serialization, or DevTools views of cache data unless those are
  taught about them.
- **Privacy.** Data persists on shared devices after sign-out unless the app clears it.

## Alternatives

- **Keep the experiment as is.** It works for class-based state but leaves storage-backed data out
  of the cache, schemas, and requests, and cannot stand in for an API.
- **A mock server** such as `@warp-drive/holodeck` or MSW. It offers full API fidelity for
  development but not on-device persistence or cross-tab sync, and needs a server or service
  worker running alongside the app.
- **Persisting request documents** with the `DocumentStorage` experiment
  (`@warp-drive/experiments/document-storage`). It keeps copies of remote data on-device; it does
  not make storage the source of truth for particular types or fields.
- **`@local` with a storage option.** `@local` is per-instance and private to WarpDrive's own
  fields. A storage field has different identity (per resource, across tabs) and is public, so a
  separate kind is clearer.

Prior art: the experiment itself; `redux-persist` and Pinia's persisted-state plugin, which
persist app state to storage; TanStack Query's persisters.

## Unresolved questions

- **Save semantics.** Automatic save or lifecycle, per the section above, and whether that is
  configurable.
- **Versioning.** Whether stored entries carry a schema version, and how mismatched entries are
  migrated or discarded.
- **Clearing.** Whether WarpDrive provides a way to clear all storage-backed data, for example on
  sign-out.
- **Key prefix.** Whether `persisted:` should be configurable to avoid collisions between apps on
  one origin.
- **Query support.** Whether `StorageHandler` should apply simple filtering and sorting, so more
  of an app's `query` calls work before the API exists.
- **Package location.** Which package exports `StorageHandler` and the graduated storage
  primitives.
