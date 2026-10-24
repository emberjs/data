---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/guides/the-manual/relational-data/features/resource-relationships.md
---
# Resource Relationships

A **resource relationship** points at a single related resource. In a schema it is a field with
`kind: 'resource'`:

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'name', kind: 'field' },
    {
      name: 'bestFriend',
      kind: 'resource',
      type: 'user',
      options: { inverse: 'bestFriend', async: false },
    },
  ],
});
```

* `type` names the related resource type (or the abstract type for a
  [polymorphic](./polymorphism.md) relationship).
* `options.inverse` names the field on the related resource that points back, or `null` for a
  one-way relationship. See [Inverses](./inverses.md).
* `options.async` declares whether the API is expected to include the relationship's `data` with
  the parent resource. See [Sync vs Async](./sync-vs-async.md).
* `sourceKey` may be given when the API uses a different key for the field than your app does.

## The Value Is A Document

The value of a `resource` field is a [ReactiveRelationshipDocument](/api/@warp-drive/core/reactive/types/ReactiveRelationshipDocument):
a small reactive object that mirrors the relationship exactly as your API describes it.

```ts
const user = store.peekRecord<User>('user', '1');

user.bestFriend.data;  // User | null | undefined
user.bestFriend.links; // { related: '/users/1/best-friend' } | undefined
user.bestFriend.meta;  // { since: '2020' } | undefined
```

This mirrors the shape of a relationship in a [JSON:API](https://jsonapi.org/format/#document-resource-object-relationships)
payload, which is also the shape the cache stores:

```json
{
  "type": "user",
  "id": "1",
  "relationships": {
    "bestFriend": {
      "links": { "related": "/users/1/best-friend" },
      "meta": { "since": "2020" },
      "data": { "type": "user", "id": "2" }
    }
  }
}
```

| `data` in the payload | `doc.data` |
| --- | --- |
| `{ type, id }` | the related record |
| `null` | `null` — the relationship is known to be empty |
| absent | `undefined` — membership is unknown, use `doc.fetch()` (only valid when `async: true`) |

The referenced resource **must** be included in the payload; reading `data` for a resource that was
never loaded throws. A sync (`async: false`) relationship must carry `data` whenever it appears in a
payload, and an async one must carry `links.related`. See [Sync vs Async](./sync-vs-async.md) and
the [specification](../spec.md).

The document instance is stable: reading `user.bestFriend` twice returns the same object, and its
properties update in place when the cache changes. Rendering `user.bestFriend.data?.name` in a
template re-renders when the relationship is updated by a new payload.

## `links` And `meta` Are Server-Owned

`links` and `meta` always reflect the **last payload received from the API**, on editable and
immutable records alike. Local mutations never change them. That keeps them trustworthy as a
description of the server's view, but it means anything in `meta` that is derived from membership
is stale while the relationship has unsaved changes. The immutable record keeps showing the related
record the API last confirmed until the change is saved.

## Fetching

When the relationship carries a `related` link, `doc.fetch()` requests it through the store's
request pipeline and resolves with the same relationship document:

```ts
const doc = await user.bestFriend.fetch();
doc === user.bestFriend; // true
doc.data;                // the resource the response returned
```

`fetch()` issues an ordinary GET [request](../../requests/index.md) for `links.related` (or
`links.self` when there is no `related` link). Pass request options such as `headers` to it, but
not a `url`, which is always the link. The response is cached as a request document whose key is
`doc.identifier`, and its `data` is written into the relationship's remote state, the same as if
the API had pushed it. The relationship's `links` and `meta` are kept. A response without `data`
leaves the relationship unchanged.

## Mutating

Relationships are changed through the document's `data`, never by assigning the field:

```ts
editable.bestFriend.data = otherUser; // replace
editable.bestFriend.data = null;      // clear

editable.bestFriend = otherUser;      // ❌ asserts
```

In [LegacyMode](../../schemas/resources/legacy-mode.md) every record is editable. In
[PolarisMode](../../schemas/resources/polaris-mode.md) a record is immutable until it is
[checked out](../../schemas/resources/polaris-mode.md) for editing; the immutable record keeps
showing the last state received from the API while the checked-out copy shows local changes.

```ts
import { checkout } from '@warp-drive/core/reactive';

const editable = await checkout(user);
editable.bestFriend.data = otherUser;

user.bestFriend.data;     // still the remote value
editable.bestFriend.data; // otherUser
```

Setting `data` updates the [inverse](./inverses.md) as well, following the same local/remote
split: the inverse's immutable record is unchanged until the change is saved or committed, while a
checked-out inverse reflects it immediately.

See [Adding & Removing](../mutating/adding-removing.md) and [Saving](../mutating/saving.md).

## Creating Records

Pass the related record when creating:

```ts
const user = store.createRecord<User>('user', { name: 'Chris', bestFriend: otherUser });
user.bestFriend.data; // otherUser
```
