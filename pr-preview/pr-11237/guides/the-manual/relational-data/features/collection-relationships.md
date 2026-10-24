---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/guides/the-manual/relational-data/features/collection-relationships.md
---
# Collection Relationships

A **collection relationship** points at a set of related resources. In a schema it is a field with
`kind: 'collection'`:

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'name', kind: 'field' },
    {
      name: 'friends',
      kind: 'collection',
      type: 'user',
      options: { inverse: 'friends', async: false },
    },
  ],
});
```

The options are the same as for [resource relationships](./resource-relationships.md): `type`,
`options.inverse`, `options.async`, `options.polymorphic`/`options.as` and `sourceKey`.

## The Value Is A Document

The value of a `collection` field is a [ReactiveRelationshipDocument](/api/@warp-drive/core/reactive/types/ReactiveRelationshipDocument)
whose `data` is a reactive array of the related records:

```ts
const user = store.peekRecord<User>('user', '1');

user.friends.data;         // User[] | undefined
user.friends.data?.length; // 2
user.friends.links;        // { related: '/users/1/friends' } | undefined
user.friends.meta;         // { count: 2 } | undefined
```

| `data` in the payload | `doc.data` |
| --- | --- |
| `[{ type, id }, ...]` | a reactive array of the related records |
| `[]` | an empty array — the relationship is known to be empty |
| absent | `undefined` — membership is unknown, use `doc.fetch()` (only valid when `async: true`) |

Every referenced resource **must** be included in the payload; reading `data` when a member was
never loaded throws. A sync (`async: false`) relationship must carry `data` whenever it appears in a
payload, and an async one must carry `links.related`. See [Sync vs Async](./sync-vs-async.md) and
the [specification](../spec.md).

Both the document and its `data` array are stable instances. The array behaves like a native
array (`Array.isArray`, `map`, `filter`, iteration, `length`) and updates in place when the cache
receives a new membership for the relationship, so templates rendering it re-render automatically.

## `links` And `meta` Are Server-Owned

`links` and `meta` always reflect the **last payload received from the API**, on editable and
immutable records alike. Local mutations never change them. A `meta.count` therefore describes the
remote membership, not the array you are editing:

```ts
editable.friends.data.push(a);

editable.friends.meta.count;  // still the server's count
editable.friends.data.length; // one more than the server's count
```

Prefer `data.length` over `meta.count` while the record has unsaved changes. The immutable record
still shows the membership the API last confirmed, and the cache reports whether a relationship has
unsaved changes:

```ts
store.cache.changedRelationships(recordIdentifierFor(user)).has('friends'); // true
```

## Membership Is Complete, Not Paged

A collection relationship holds **the whole membership** of the relationship as last described by
your API. Every payload for the field replaces that membership; if a response includes only part
of the list, the relationship will only contain that part.

This is by design. Collection relationships are for lists that belong to the parent and are small
enough to send along with it: a post's tags, a user's addresses, an order's line items. They do
not paginate, sort or filter. Pagination links your API places on the relationship are available
on `doc.links` but are never merged into `data`.

For lists that need those features — comments on a popular post, a user's activity history, a
searchable membership list — load them with a **top-level request** instead. A top-level request
has its own cache entry, can carry `page`, `sort` and `filter` parameters, and works with the
[pagination utilities](../advanced/pagination.md). See [Large Collections](../advanced/large-collections.md)
for how to keep the two apart and how to have WarpDrive warn you when a relationship grows too
large.

## Fetching

When the relationship carries a `related` link, `doc.fetch()` requests it, writes the returned
members into the relationship, and resolves with the same relationship document:

```ts
const friends = await user.friends.fetch();
friends === user.friends; // true
friends.data;             // the members the response returned
```

As with resource relationships, the response is also cached as a request document under
`doc.identifier`.

## Mutating

Relationships are changed through the document's `data`, never by assigning the field. When the
record is editable, the `data` array supports the standard mutation methods and can be replaced
wholesale:

```ts
editable.friends.data.push(user);            // add to the end
editable.friends.data.unshift(user);         // add to the front
editable.friends.data.splice(1, 0, user);    // insert
editable.friends.data.splice(0, 1);          // remove
editable.friends.data.pop();
editable.friends.data.shift();
editable.friends.data.sort(byName);          // reorder
editable.friends.data[0] = user;             // replace one member
editable.friends.data = [a, b];              // replace the membership

editable.friends = [a, b];                   // ❌ asserts
```

A record may only appear once in a collection: adding a record that is already a member throws.

In [LegacyMode](../../schemas/resources/legacy-mode.md) every record is editable. In
[PolarisMode](../../schemas/resources/polaris-mode.md) mutate the copy returned by
[checkout](../../schemas/resources/polaris-mode.md); the immutable record and its array keep
showing the remote membership until the change is saved or committed. Inverses follow the same
rule.

See [Adding & Removing](../mutating/adding-removing.md) and [Saving](../mutating/saving.md).

## Creating Records

Pass an array of related records when creating:

```ts
const user = store.createRecord<User>('user', { name: 'Chris', friends: [a, b] });
user.friends.data; // [a, b]
```
