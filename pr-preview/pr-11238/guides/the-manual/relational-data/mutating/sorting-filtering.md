---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/guides/the-manual/relational-data/mutating/sorting-filtering.md
---
# Sorting & Filtering

A relationship represents **which** resources are related — not how a particular screen wants to
see them. Sorting and filtering are presentation (or query) concerns and belong somewhere else.

## Sorting Or Filtering For Display

Derive a new array; do not mutate the relationship:

```ts
const activeFriends = user.friends.data?.filter((friend) => friend.isActive) ?? [];
const byName = [...(user.friends.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
```

Calling `sort()` directly on `editable.friends.data` **reorders the relationship** and marks it
dirty, which is rarely what a list view wants. Reserve it for cases where the order is part of the
data your API stores (e.g. a user-defined ordering that will be saved).

In a template, put the derived array behind a getter or a [derivation](../../schemas/derivations.md)
so it is recomputed only when the relationship changes.

## Sorting Or Filtering On The Server

If the sorted or filtered result should come from the API — because the full set is large, or
because the criteria are complex — use a **top-level request** with query parameters rather than
the relationship:

```ts
import { query } from '@warp-drive/utilities/json-api';

const { content } = await store.request(
  query<Comment>('comment', {
    filter: { post: post.id, approved: true },
    sort: '-createdAt',
    page: { size: 25 },
  })
);
content.data; // Comment[]
```

The request gets its own cache entry keyed by its URL, so different sorts and filters of the same
underlying list coexist without overwriting each other or the relationship. This is also the path
to take for [pagination](../advanced/pagination.md) and for
[large collections](../advanced/large-collections.md) generally.
