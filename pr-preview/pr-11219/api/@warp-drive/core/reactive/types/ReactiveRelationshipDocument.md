---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/reactive/types/ReactiveRelationshipDocument.md
---

# &#x20;ReactiveRelationshipDocument\<T>

```ts
interface ReactiveRelationshipDocument<T> {
  data: T | undefined;
  readonly identifier: RequestKey | null;
  readonly links?: 
  | Links
  | PaginationLinks;
  readonly meta?: ObjectValue;
  fetch(options?: RequestInfo<unknown>): Promise<ReactiveRelationshipDocument<T>>;
  toJSON(): object;
}
```

Defined in: [warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts:77](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts#L77)

The reactive document produced for a `resource` or `collection`
relationship field on a [ReactiveResource](ReactiveResource.md).

```ts
const user = store.peekRecord<User>('user', '1');

user.bestFriend.data;  // User | null | undefined
user.bestFriend.links; // { related: '/users/1/best-friend' }
user.bestFriend.meta;  // { ... }

user.friends.data;     // User[] | undefined
```

`data` is a reactive view of the relationship's membership in the cache.
For an immutable (PolarisMode) resource it reflects the remote state; for
an editable resource (LegacyMode, or a resource that has been checked out
for editing) it reflects the local state, including unsaved changes.

`links` and `meta` are server-owned and **always** reflect the last
payload received from the API, on editable and immutable resources alike.
They are never changed by local mutations, so `meta` derived from
membership (e.g. a `count`) becomes stale while the relationship has
unsaved changes.

`data` is `undefined` when the relationship payload did not include a
`data` member (e.g. a links-only payload for an async relationship);
`null` (resource) or an empty array (collection) mean the relationship
is known to be empty. Use [fetch](#fetch)
to load the relationship through its `related` link: the response updates
`data`, and the promise resolves with this same document.

When the owning resource is editable the relationship may be mutated
through `data`:

```ts
editableUser.bestFriend.data = otherUser; // or null
editableUser.friends.data.push(otherUser);
editableUser.friends.data = [a, b];
```

Assigning to the field itself (`user.bestFriend = x`) is never allowed.

Collection relationships are not paginated: pagination links present on
the relationship are surfaced on `links` but never merged into `data`.

When serializing a relationship for a request, send only the identifiers
of `data`; `links` and `meta` describe the server's view and must not be
echoed back to it.

## Type Parameters

### T

`T`

## Methods

### fetch()

```ts
fetch(options?: RequestInfo<unknown>): Promise<ReactiveRelationshipDocument<T>>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts:145](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts#L145)

Requests this relationship's `related` link (falling back to its `self`
link) and resolves with this same document once the response has been
applied to it.

The response's `data` becomes the relationship's remote membership, the
same as a payload for the parent resource that includes the relationship
would: immutable records show it, and editable records reconcile it with
any unsaved local changes. The relationship's `links` and `meta` are kept;
the response's top-level `links` and `meta` describe the response, not
the relationship. Every resource the response references must be in it.

```ts
const friends = await user.friends.fetch();
friends === user.friends; // true
friends.data; // the members the API returned
```

The response is also cached as a request document under
[identifier](#identifier).

#### Parameters

##### options?

[`RequestInfo`](../../types/request/types/RequestInfo.md)<`unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`ReactiveRelationshipDocument`<`T`>>

***

### toJSON()

```ts
toJSON(): object;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts:156](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts#L156)

Implemented for `JSON.stringify` support.

This is a shallow serialization of the document's shape (`data`, `links`,
`meta`), not a request payload: when serializing the relationship for a
request, send only the identifiers of `data`.

#### Returns

`object`

## Properties

### data

```ts
data: T | undefined;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts:86](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts#L86)

The related resource(s). `undefined` when the relationship has not
received membership data.

Assignable when the owning resource is editable.

***

### identifier

```ts
readonly identifier: RequestKey | null;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts:120](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts#L120)

The cache key of the request document for this relationship's `related`
link (or its `self` link when there is no `related` link), or `null` when
the relationship has neither.

It is the same key a top-level request for that URL is cached under, and
the key [fetch](#fetch) caches its
response under. It updates when the relationship's links change.

***

### links?

```ts
readonly optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts:96](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts#L96)

The links object for this relationship, if any.

Server-owned: always reflects the last payload received from the API
and is never affected by local mutations.

***

### meta?

```ts
readonly optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts:107](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/fields/relationship-document.ts#L107)

The meta object for this relationship, if any.

Server-owned: always reflects the last payload received from the API
and is never affected by local mutations. Values derived from membership
(such as a `count`) are stale while the relationship has unsaved changes.
