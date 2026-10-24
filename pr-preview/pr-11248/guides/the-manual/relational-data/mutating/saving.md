---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/guides/the-manual/relational-data/mutating/saving.md
description: >-
  How to persist relationship edits with a request or by committing without one,
  and how saving related records works for resource, collection, and legacy
  fields.
---

# Saving

Relationship edits live in the cache as local state until they are persisted. How you persist them
depends on how your app talks to its API.

## With Requests

Build a request for the record, attach a body describing its changes, and send it with
`store.request`. The `@warp-drive/utilities` package ships JSON:API and REST builders such as
`updateRecord`, which set the URL, method and headers but **not** the body; your app supplies that.
The [builders guide](../../requests/builders.md) covers writing your own.

```ts
import { cacheKeyFor } from '@warp-drive/core';
import { checkout } from '@warp-drive/core/reactive';
import { serializePatch, updateRecord } from '@warp-drive/utilities/json-api';

const editable = await checkout<User>(user);
editable.friends.data!.push(newFriend);

const init = updateRecord(editable, { patch: true });
init.body = JSON.stringify(
  // a starting point: transform this into the shape your API expects
  serializePatch(store.cache, cacheKeyFor(editable))
);
await store.request(init);
```

When the response arrives the cache applies the returned payload as the new **remote** state: the
relationship's membership becomes what the API said it is, and immutable records update. A
relationship the response leaves out is **not** updated: its edits stay local and unsaved, and
immutable records keep showing the old membership. Have the API return every
relationship it saved, or push a payload that includes them once the save succeeds.

::: tip
Relationship payloads use replace semantics: the `data` array in the response becomes the entire
membership. Make sure your API returns the complete relationship (or omits the `data` key entirely
to leave it untouched).
:::

### Serialize Identifiers Only

In the request body, send a relationship as its `data` alone: the identifiers of the related
records, without the `links` or `meta` the API sent you. For the example above, where `user:1`
had friends `2` and `3` and `4` was added, `serializePatch` produces:

```json
{
  "data": {
    "type": "user",
    "id": "1",
    "relationships": {
      "friends": {
        "data": [
          { "type": "user", "id": "2" },
          { "type": "user", "id": "3" },
          { "type": "user", "id": "4" }
        ]
      }
    }
  }
}
```

`links` and `meta` describe the server's view of the relationship as of the last response. While a
record is being edited they are stale relative to `data`; `meta.count` would
still say `2` here, so sending them back gives the API a contradictory relationship.

The `@warp-drive/utilities/json-api` serializers are starting points, not finished request bodies:
they serialize cache state, and only your app knows the exact shape its API accepts, so expect to
transform their output. `serializePatch` includes only the relationships that changed, and only
their `data`. `serializeResources`, which serializes the whole record, copies each relationship from
the cache as-is, `links` and `meta` included, so remove those before sending it. `doc.toJSON()` is a
description of the document for debugging, not a request body.

## Committing Without A Request

Occasionally an app knows a change has been persisted through some other channel. `commit()`
promotes an editable record's local state to remote state:

```ts
import { commit } from '@warp-drive/core/reactive';

await commit(editable);
```

Use this sparingly; letting the API response drive the cache keeps client and server in agreement.

## Saving Related Records

A collection relationship does not save its members. If members themselves have changes, save
them individually (or with a bulk endpoint your API provides). To create a related record and
attach it in one step:

```ts
const comment = store.createRecord<Comment>('comment', { body, post: editablePost });
await store.request(createRecord(comment));
```

The inverse (`editablePost.comments`) gains the new record locally when it is created, and the
save response confirms it.

## Legacy `belongsTo` And `hasMany`

Records using the legacy request methods (`record.save()`, `store.saveRecord`) persist their
relationship changes through the configured adapter and serializer. Those paths only understand
`belongsTo` and `hasMany`; `resource` and `collection` fields are serialized only by request
builders.
