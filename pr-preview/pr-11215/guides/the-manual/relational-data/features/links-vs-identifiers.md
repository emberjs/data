---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/guides/the-manual/relational-data/features/links-vs-identifiers.md
---
# Links vs Identifiers

A relationship payload can describe the related data in two complementary ways:

```json
{
  "relationships": {
    "friends": {
      "links": { "related": "/users/1/friends" },
      "data": [{ "type": "user", "id": "2" }, { "type": "user", "id": "3" }]
    }
  }
}
```

* **`data`** holds resource identifiers (`{ type, id }`). It tells WarpDrive *exactly which*
  resources are related. WarpDrive uses it to build the relationship's membership, to keep
  [inverses](./inverses.md) in sync, and to produce `doc.data`.
* **`links`** holds URLs. `links.related` tells WarpDrive *where to ask* for the related
  resources. WarpDrive uses it for `doc.fetch()` and for legacy async relationships.

Either, both, or (unhelpfully) neither may be present.

## Which Should Your API Send?

For `resource` and `collection` relationships the answer follows from `async`
(see [Sync vs Async](./sync-vs-async.md) and the [specification](../spec.md)):

| `async` | Payload | Valid? | `doc.data` |
| --- | --- | --- | --- |
| `false` | `data` + every referenced resource included | ✅ | the related record(s) |
| `false` | `data: null` / `data: []` | ✅ known to be empty | `null` / `[]` |
| `false` | `links` + `data` (+ included) | ⚠️ warning: links are unnecessary | the related record(s) |
| `false` | `links` only, or `meta` only | ❌ `data` is required | — |
| `true` | `links.related` only | ✅ membership unknown until fetched | `undefined` |
| `true` | `links.related` + `data` (+ included) | ✅ | the related record(s) |
| `true` | `data` without `links.related` | ❌ a related link is required | — |
| any | `data` referencing a resource that is not included | ❌ | throws when read |
| any | `{}` | ❌ | — |

Recommendations:

* Declare `async: false` and send `data` with the related resources sideloaded in `included` when
  the members always travel with the parent.
* Declare `async: true` and send `links.related` when the members are loaded separately. Include
  `data` too if it is cheap, so that inverses stay accurate.
* An empty relationship is `data: null` (resource) or `data: []` (collection), never an empty
  object.
* If a related list is large, do not send it as relationship `data` at all. Expose it as its own
  endpoint and load it with a [top-level request](../advanced/large-collections.md).

## Identifiers Point Into The Cache

`data` never contains the related resources themselves, only their identity. `doc.data` resolves
those identifiers against the cache. Because every referenced resource must be included, that
resolution always succeeds for a valid payload; if a payload slipped through without including a
member, reading `doc.data` throws rather than handing back an empty record.

## Links Are Not Followed Automatically

WarpDrive never fetches a `related` link on its own. Call `doc.fetch()` when you need the data;
it loads the link and fills in `doc.data`. Issue a top-level request instead when you need a
filtered, sorted or paginated view. The `next`/`prev`/`first`/`last` links an API may attach to a
relationship are surfaced on `doc.links` but relationship membership is not paginated; see
[Pagination](../advanced/pagination.md).
