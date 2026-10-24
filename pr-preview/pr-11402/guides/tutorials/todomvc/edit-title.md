---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/guides/tutorials/todomvc/edit-title.md
description: >-
  See how each todo becomes an editable copy, then save a new title with one
  request that every list shows.
---

# Edit title

Double-click a todo, type a new title, press Enter. The old title comes back.
Let's save it, with one request that updates every list at once.

## Editable copies

Records are read-only, so when you edit a todo, you're editing a copy of it.
The starter's list hands each item an editable copy. In
`app/components/todo-app/todo-list.gts`, each todo passes through `checkout`:

```gts
import { checkout } from '@warp-drive/core/reactive';

export class TodoList extends Component<Signature> {
  <template>
    {{#each @todos as |immutableTodo|}}
      <Await @promise={{this.checkout immutableTodo}}>
        <:success as |mutableTodoCopy|>
          <TodoItem @todo={{mutableTodoCopy}} ... />
        </:success>
      </Await>
    {{/each}}
  </template>

  checkout(todo: Todo): Promise<EditableTodo> {
    return checkout<EditableTodo>(todo);
  }
}
```

`checkout`, from `@warp-drive/core/reactive`, returns an editable copy of a
record. The component's `this.checkout` is a one-line wrapper that tells
TypeScript the copy is an `EditableTodo`, a type from `app/data/schemas/todo.ts`.

`checkout` is async, so `<Await>` renders the item once the copy is ready.
Changes to a copy stay on it until you save, while the cache and every other
view of the todo keep showing what the server last sent. The title form doesn't
change the copy at all: it reads the new title from its input and sends only
that.

## Write the builder

Create a new file, `app/data/builders/update.ts`:

```ts
import { recordIdentifierFor } from '@warp-drive/core';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withReactiveResponse } from '@warp-drive/core/request';
import type { RequestInfo } from '@warp-drive/core/types/request';
import { buildBaseURL } from '@warp-drive/utilities';

import type { Todo, TodoAttributes } from '../schemas/todo.ts';

/** PATCH /api/todo/:id */
export function patchTodo(todo: Todo, attributes: Partial<TodoAttributes>): RequestInfo<ReactiveDataDocument<Todo>> {
  return withReactiveResponse<Todo>({
    method: 'PATCH',
    url: buildBaseURL({ op: 'updateRecord', identifier: { type: 'todo', id: todo.id } }),
    body: JSON.stringify({ data: { type: 'todo', id: todo.id, attributes } }),

    // 'updateRecord' plus the todo's key: on success the cache commits the
    // response to this todo, and every list holding it re-renders.
    op: 'updateRecord',
    records: [recordIdentifierFor(todo)],
  });
}
```

`recordIdentifierFor(todo)`, from `@warp-drive/core`, returns the todo's cache
key: its `type` and `id`. `op: 'updateRecord'` with that key in `records` tells
the cache which todo this request saves, so the response is written into that
todo. `buildBaseURL` turns the type and id into `/api/todo/<id>`, and
`attributes` is `Partial`, so the body carries only what changed.

## Send it

In `app/components/todo-app/todo-item.gts`, `TitleForm` has a `patchTodoTitle`
method that doesn't save anything yet. Have it send the request:

```ts
// At the top of the file:
import { patchTodo } from '#app/data/builders/update.ts';

// ...

await this.store.request(patchTodo(todo, { title }));
```

## Check it

Double-click a todo, change its title, press Enter. It sticks, and it's still
there after a reload.

The Network panel shows one `PATCH` and no `GET`. The response updated the one
cached todo, and every list holds that same todo, so every list shows the new
title. Without a shared cache, you'd update each list yourself, or refetch them
all.

## What's next

Chapter 6 saves a todo's completed state. It's the same `patchTodo`, but this
time the todo has to change lists, and the cache can't work that out on its own.
