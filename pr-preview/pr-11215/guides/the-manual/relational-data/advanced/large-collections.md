---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/guides/the-manual/relational-data/advanced/large-collections.md
---
# Large Collections

A `collection` relationship holds the complete membership of a relationship and materializes a
record for every member when accessed. That is exactly right for a post's tags or a user's
addresses. It is the wrong tool for a post's comments, a user's activity history, or anything a
user would expect to scroll, search or sort.

This page explains the boundary, how WarpDrive can enforce it for you, and what to do instead.

## Why Not Load Everything Through The Relationship?

* **Every payload replaces the whole membership.** If the API sends a partial list, the
  relationship silently becomes that partial list.
* **Relationships do not paginate, sort or filter.** `next`/`prev` links on a relationship are
  surfaced but never followed into `data`.
* **Cost scales with the parent.** Loading a user means loading every identifier in every
  collection on that user, and every inverse edge for each of them.
* **The list is a query, not a fact.** "Comments on this post, newest first, approved only,
  page 3" is a request; "this comment belongs to this post" is a relationship.

## The Rule Of Thumb

Ask: *would a user ever want to page, sort or filter this list?* If yes, load it with a
[top-level request](./pagination.md) and keep the relationship for bookkeeping (usually via the
[inverse](../features/inverses.md) on the many side, e.g. `comment.post`). If no, and the list is
bounded by the domain (a handful to a few dozen members), a `collection` relationship is a good fit.

## Enforcing It: `maxCollectionRelationshipSize`

WarpDrive can tell you when a `collection` relationship receives more members than you intended.
Configure a limit on the store:

```ts [services/store.ts]
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export const Store = useRecommendedStore({
  cache: JSONAPICache,
  maxCollectionRelationshipSize: 100,
});
```

Or on a custom Store subclass:

```ts
class AppStore extends Store {
  maxCollectionRelationshipSize = 100;
}
```

When any remote payload for a `collection` field carries a `data` array longer than the limit,
WarpDrive throws an error **asynchronously** (from a microtask) after the payload has been applied:

```
Error: The collection relationship post.comments received 250 related resources, exceeding the
configured maxCollectionRelationshipSize of 100. Large collections should be loaded with a
top-level (paginated) request instead of through the relationship.
```

Throwing asynchronously means the cache is never left half-updated and the request that carried
the payload still resolves, while the error still reaches `window.onerror`, your error reporter,
and fails tests. Treat it as a signal that the API response or the schema should change — usually
by removing the relationship's `data` from the parent payload and exposing the list as its own
endpoint.

### What The Check Is (And Isn't)

| | |
| --- | --- |
| Counts | the length of `data` in **one** relationship payload |
| Applies to | `collection` fields only — not legacy `hasMany`, not `resource` |
| Triggers on | remote updates (payloads pushed into the cache) |
| Does not trigger on | local mutations (`data.push(...)`), or payloads without a `data` key |
| Rejects the payload? | no — the data is applied, then the error is thrown |
| Default | off (`null`) |

The limit is not a byte size and does not consider how many members the relationship already had;
it is a per-payload cardinality check. Because inverses are updated from each side's own payload,
a large list will typically trip the check on the parent's payload even if the many side is loaded
in pages.

### Choosing A Value

Set the limit to the page size you would use if the list were paginated in your UI. Most apps land
between 50 and 200. A limit that is far higher than any real relationship is harmless; a limit that
is too low turns legitimate relationships into noise. Start higher and tighten as you learn which
relationships in your API are actually bounded.

## Valid Relationship Payloads, Summarized

For reference, these are the payload shapes for a `collection` relationship and how WarpDrive
treats each (the normative list is in the [specification](../spec.md)):

| Payload | `async: false` | `async: true` |
| --- | --- | --- |
| `{ data: [ids...] }` + members included | ✅ complete membership | ❌ `links.related` required |
| `{ links: { related }, data: [ids...] }` + members included | ⚠️ links are unnecessary (warning) | ✅ complete membership, re-fetchable |
| `{ links: { related } }` | ❌ `data` required | ✅ membership unknown; `doc.data` is `undefined` until fetched |
| `{ data: [] }` | ✅ known to be empty | ❌ `links.related` required |
| `{ meta: {...} }` alone | ❌ `data` required | ❌ `links.related` required |
| `{ data: [ids...] }` with a member **not** included | ❌ reading `doc.data` throws | ❌ reading `doc.data` throws |
| `{ ..., links: { next, prev } }` | pagination links are exposed on `doc.links` but never followed into `data` | same |

For a `resource` relationship replace the array with a single identifier or `null`. The same
rules apply, minus the size check.
