---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/reactive/types/ReactiveResourceState.md
description: >-
  The reactive lifecycle state (new, empty, deleted, dirty, and per-field
  changes) that PolarisMode resources expose as `$state`.
---

# &#x20;ReactiveResourceState

```ts
interface ReactiveResourceState {
  readonly changes: Readonly<Record<string, ResourceFieldChange | undefined>>;
  readonly isDeleted: boolean;
  readonly isDeletionCommitted: boolean;
  readonly isDirty: boolean;
  readonly isEmpty: boolean;
  readonly isNew: boolean;
}
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:81](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L81)

The reactive lifecycle state of a [ReactiveResource](ReactiveResource.md), available
as `$state` on any resource whose schema was built with
[withDefaults](../functions/withDefaults.md) (and whose derivations were registered with
[registerDerivations](../functions/registerDerivations.md)).

## Example

```ts
const user = store.peekRecord<User>('user', '1');

if (user.$state.isDirty) {
  // offer to save or discard
}

if (user.$state.changes.name) {
  // only the name field has local changes
}
```

Every property is reactive: reading it in a template, component or
other reactive context will update when the underlying state changes.

`$state` describes the resource in the cache, not a particular view of
it, so an immutable resource and its editable checkout report the
same state. Request state, such as whether a save is in flight or
failed, is a property of the request, see [getRequestState](../functions/getRequestState.md).

## Properties

### changes

```ts
readonly changes: Readonly<Record<string, ResourceFieldChange | undefined>>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:149](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L149)

The local changes to the resource's fields, keyed by field name.

Each entry is reactive on its own: reading `changes.name` only
updates when `name` changes, not when another field does. Reading
the set of keys (e.g. `Object.keys(changes)`) updates when any field
changes.

A field without local changes has no entry. Only fields the cache
stores data for are tracked: identity, `derived`, `alias` and
`@local` fields never have an entry.

***

### isDeleted

```ts
readonly isDeleted: boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:113](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L113)

`true` if the resource has been marked for deletion locally.

This remains `true` once the deletion has been committed, use
[ReactiveResourceState.isDeletionCommitted](#isdeletioncommitted) to distinguish.

***

### isDeletionCommitted

```ts
readonly isDeletionCommitted: boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:121](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L121)

`true` if a deletion of the resource has been successfully
persisted.

***

### isDirty

```ts
readonly isDirty: boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:133](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L133)

`true` if the resource has local changes that have not been
persisted: it is new, it is marked for deletion, or any of its
fields or relationships have been changed.

A new resource that is deleted before it is ever saved, and a
resource whose deletion has been committed, are not dirty.

***

### isEmpty

```ts
readonly isEmpty: boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:103](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L103)

`true` if the cache reports the resource as empty, i.e.
`cache.isEmpty` for a resource that is not new. A new resource is
never empty.

For the JSON:API cache, a resource is empty when it has no field
data at all, which a materialized PolarisMode resource typically
only reaches when it is removed from the store, e.g. via
`store.unloadRecord`, while something still holds a reference to
the record.

***

### isNew

```ts
readonly isNew: boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:88](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L88)

`true` if the resource was created locally and has not yet been
successfully persisted, e.g. via `store.createRecord`.
