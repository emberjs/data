---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/guides/the-manual/relational-data/mutating/adding-removing.md
---
# Adding & Removing

Relationships are edited through the value of the field on an **editable** record. Which records
are editable depends on the resource's [mode](../../schemas/index.md#modes):

* **LegacyMode** — every record is editable.
* **PolarisMode** — records are immutable; edit the copy returned by `checkout()`.

```ts
import { checkout } from '@warp-drive/core/reactive';

const editable = await checkout(user); // PolarisMode only
```

## Resource Relationships

Assign the related record, or `null`, to the document's `data`:

```ts
editable.bestFriend.data = otherUser;
editable.bestFriend.data = null;
```

## Collection Relationships

Use the array methods on the document's `data`, or replace the array:

```ts
editable.friends.data.push(a, b);
editable.friends.data.unshift(c);
editable.friends.data.splice(index, 1);
editable.friends.data.splice(index, 0, d);
editable.friends.data.pop();
editable.friends.data.shift();
editable.friends.data.sort(compare);
editable.friends.data[0] = e;
editable.friends.data.length = 0;   // remove everything
editable.friends.data = [a, b];      // replace the membership
```

Each call is translated into a granular cache mutation (`add`, `remove`, `replaceRelatedRecords`,
`sortRelatedRecords`), so the [graph](../advanced/the-graph.md) knows exactly what changed and
updates any [inverse](../features/inverses.md) accordingly. A record may appear only once in a
collection; adding a duplicate throws.

## What You Cannot Do

Assigning the relationship field itself asserts, in every mode:

```ts
editable.bestFriend = otherUser; // ❌
editable.friends = [a, b];       // ❌
```

The field's value is the document; the document's `data` is the relationship.

## Legacy `belongsTo` And `hasMany`

The legacy field kinds keep their historical API: assign the record(s) to the field, or mutate the
`ManyArray`:

```ts
user.bestFriend = otherUser;
user.friends.push(a);
user.friends = [a, b];
```

Mixed schemas work as expected: a `collection` whose inverse is a legacy `belongsTo` (or vice
versa) stays in sync in both directions.

## Local vs Remote

Edits are **local** until saved. On an editable PolarisMode record the change is visible on the
checked-out copy and on checked-out copies of any inverse; the immutable records continue to show
the last state received from the API. When the save response arrives the remote state is updated
and the immutable records reflect the change. See [Saving](./saving.md).

Only `data` is affected by an edit. `links` and `meta` stay as the API last sent them, so
`meta.count` describes the remote membership until the save is confirmed:

```ts
editable.friends.data.push(a);
editable.friends.meta.count;  // server's count
editable.friends.data.length; // server's count + 1
user.friends.data.length;     // server's count, on the immutable record
```

To find out whether a record has relationship changes that are not saved yet, ask the cache with
`store.cache.changedRelationships(recordIdentifierFor(user))`.
