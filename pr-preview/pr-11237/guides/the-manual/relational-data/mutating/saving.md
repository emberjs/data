---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/guides/the-manual/relational-data/mutating/saving.md
---
# Saving

Relationship edits live in the cache as local state until they are persisted. How you persist them
depends on how your app talks to its API.

## With Requests

Build a request that serializes the record (including its changed relationships) and send it with
`store.request`. The [builders guide](../../requests/builders.md) covers writing builders; the
`@warp-drive/utilities` package ships JSON:API and REST builders such as `updateRecord`.

```ts
import { updateRecord } from '@warp-drive/utilities/json-api';

editable.friends.data.push(newFriend);
await store.request(updateRecord(editable));
```

When the response arrives the cache applies the returned payload as the new **remote** state: the
relationship's membership becomes what the API said it is, and immutable records update. A
relationship the response leaves out keeps its local changes: it stays unsaved, and immutable records
keep showing the previous remote state, until a payload that includes it arrives.

::: tip
Relationship payloads use replace semantics: the `data` array in the response becomes the entire
membership. Make sure your API returns the complete relationship (or omits the `data` key entirely
to leave it untouched).
:::

### Serialize Identifiers Only

When a builder serializes a relationship for a request it should send **only the identifiers of
`data`**, never the document's `links` or `meta`:

```ts
// ✅ what the API should receive for a collection relationship
{ friends: { data: [{ type: 'user', id: '2' }, { type: 'user', id: '4' }] } }

// ❌ do not echo server-owned fields back
{ friends: { data: [...], links: { related: '/users/1/friends' }, meta: { count: 2 } } }
```

`links` and `meta` describe the server's view of the relationship as of the last response. While a
record is being edited they are stale relative to `data`, so echoing them back
would send the API a contradictory relationship. `doc.toJSON()` is a shallow description of the
document for debugging and `JSON.stringify`, not a request payload; use `recordIdentifierFor` (or
the cache's `peek`) to build the identifiers you send.

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
