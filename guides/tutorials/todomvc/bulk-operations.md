---
url: https://canary.warp-drive.io/guides/tutorials/todomvc/bulk-operations.md
description: >-
  Toggle or clear many todos with one request each, and update the cache
  yourself when the response doesn't say what changed.
---

# Bulk operations

Two controls act on many todos at once: the "Mark all as complete" arrow beside
the input, and "Clear completed" in the footer. This API has one request for
each, so let's write those.

## Write the builders

JSON:API doesn't define bulk updates, so the API has two endpoints of its own.
Both answer `{ "data": null }`, without the todos they changed. Real APIs often
work like this, and the cache tools from chapters 6 and 7 fill the gap.

Create a new file, `app/data/builders/bulk.ts`:

```ts
import { recordIdentifierFor } from '@warp-drive/core';
import { withResponseType } from '@warp-drive/core/request';
import type { PersistedResourceKey } from '@warp-drive/core/types/identifier';
import type { RequestInfo } from '@warp-drive/core/types/request';
import { buildBaseURL, buildQueryParams } from '@warp-drive/utilities';

import type { Todo } from '../schemas/todo.ts';
import type Store from '../store.ts';
import { patchCacheTodoActivated, patchCacheTodoCompleted } from './update.ts';

interface EmptyDocument {
  data: null;
}

/**
 * PATCH /api/todo/ops.bulk.patchAll — used by "toggle all". Sets `completed`
 * on every todo that doesn't already have it.
 */
export function bulkPatchTodos(attributes: { completed: boolean }): RequestInfo<EmptyDocument> {
  const url = buildBaseURL({ resourcePath: 'todo' });
  const queryString = buildQueryParams({ 'filter[completed]': !attributes.completed });

  return withResponseType<EmptyDocument>({
    method: 'PATCH',
    url: `${url}/ops.bulk.patchAll?${queryString}`,
    body: JSON.stringify({ attributes }),
  });
}

/**
 * Applies a "toggle all" to the cache. The server replies with no todos, so
 * we set `completed` on each changed todo ourselves and move it into the
 * matching cached list. Pass only the todos that actually changed.
 */
export function bulkPatchCacheTodos(store: Store, changed: Todo[], completed: boolean): void {
  for (const todo of changed) {
    // A saved todo always has an id; the cast tells TypeScript so.
    const record = recordIdentifierFor(todo) as PersistedResourceKey<'todo'>;
    store.cache.patch({ record, op: 'update', field: 'completed', value: completed });
    if (completed) patchCacheTodoCompleted(store, todo);
    else patchCacheTodoActivated(store, todo);
  }
}

/**
 * DELETE /api/todo/ops.bulk.deleteAll — used by "clear completed". Deletes
 * every completed todo; pass the completed todos so the cache can drop them.
 */
export function bulkDeleteTodos(todos: Todo[]): RequestInfo {
  const url = buildBaseURL({ resourcePath: 'todo' });
  const queryString = buildQueryParams({ 'filter[completed]': true });

  return {
    method: 'DELETE',
    url: `${url}/ops.bulk.deleteAll?${queryString}`,

    // Removes each todo from every cached list once the request succeeds.
    op: 'deleteRecord',
    records: todos.map((todo) => recordIdentifierFor(todo)),
  };
}
```

**Toggle all.** `bulkPatchTodos` filters on the opposite of the new value, so
the API changes only the todos that need it. The response is `{ data: null }`,
with no todos, so `withResponseType<EmptyDocument>` declares that shape. Like
`withReactiveResponse`, it only sets the type TypeScript sees. And since the
response names no todos, `bulkPatchCacheTodos` does the cache's job by hand:
`op: 'update'` sets `completed` on each changed todo, and chapter 6's functions
move it between lists. Refetching would also work: one `PATCH`, then a `GET` for each list.
Patching keeps it to one request, and it reuses chapter 6's functions: the cache
update you wrote for one todo now covers many.

**Clear completed.** `bulkDeleteTodos` is chapter 7's `deleteTodo` with many
keys in `records`. The request already says which todos it deletes, so the cache
drops them all when it succeeds.

## Send them

In `app/components/todo-app/toggle-all-todos.gts`, the shipped code already
works out the new value and which todos change:

```ts
const completed = !this.areViewableCompleted;
const changed = this.args.todos.filter((todo) => todo.completed !== completed);
```

Inside the `try` that follows, send the request, then update the cache:

```ts
// At the top of the file:
import { bulkPatchCacheTodos, bulkPatchTodos } from '#app/data/builders/bulk.ts';

// ...

await this.store.request(bulkPatchTodos({ completed }));
bulkPatchCacheTodos(this.store, changed, completed);
```

In `app/components/todo-app/clear-completed-todos.gts`, send the delete:

```ts
// At the top of the file:
import { bulkDeleteTodos } from '#app/data/builders/bulk.ts';

// ...

await this.store.request(bulkDeleteTodos(this.args.completed));
```

## Check it

Click the arrow. Everything is struck through, the footer says "0 items left",
and "Clear completed" shows. Click it again and everything is active, and "Clear
completed" goes away. One
`PATCH` per click, and no `GET`.

Complete a few todos and click "Clear completed". Gone, in one `DELETE`.

That's it. Every control in the TodoMVC spec works, and you wrote the whole data
layer: five builder files and one handler. Along the way you used all four ideas
from chapter 2: requests built as plain objects, one pipeline with your handler
in it, a cache that keeps one copy of each todo, and read-only records you
change through copies. And after each write, you picked how the lists catch up:
chapter 4 let the store refetch them, and chapters 6 and 8 patched the cache
because you already knew what changed.

## Where next

* [Making Requests](../../the-manual/requests/index.md): the rest of the request
  API.
* [Caching](../../the-manual/caching/index.md): how the cache stores documents,
  and when a response counts as stale.
* [Schemas](../../the-manual/schemas/index.md): the other field kinds.
* [Relational Data](../../the-manual/relational-data/index.md): when your data
  has relationships.
* [Pagination](../../the-manual/experiments/pagination.md), experimental. This
  API supports `page[limit]` and `page[offset]` if you want to try it.
