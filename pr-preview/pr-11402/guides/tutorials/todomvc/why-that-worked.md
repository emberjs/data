---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/guides/tutorials/todomvc/why-that-worked.md
description: >-
  The four ideas WarpDrive is built on: requests instead of models, one path for
  every request, one cached copy of each thing, and read-only records.
---

# Why that worked

Chapter 1 took a few small edits, and you got loading states, a cache and live
records. That isn't magic. It comes from four ideas ***Warp*Drive** is built
on, and the rest of the tutorial puts each one to work. Let's find them in the
code you just ran.

## 1. You ask with requests, not models

Here's the whole of what the route asked for:

```ts
this.store.request<TodosDocument>({ url: '/api/todo' });
```

There's no model class, adapter or serializer to fit your API into. You send
the request your API already understands, and the store handles the response.
Because a request is just an object, you can build it in a function and reuse
it.

## 2. Every request takes the same path

Here's what happened when the route called `store.request`:

```
store.request({ url: '/api/todo' })
  │
  ▼
CacheHandler ──── fresh response cached for this request? ──► return it
  │ no
  ▼
your handlers     none yet
  │
  ▼
Fetch ──────────► GET /api/todo ──► API worker
                                        │
                                        ▼
JSONAPICache ◄──────────────── JSON:API document
  │  stores the document, and each todo in it by type and id
  ▼
the Future resolves: content.data is Todo[]
```

Every request goes through this same pipeline, and your handlers always sit
between the cache and the network. So anything you add there, such as headers,
auth or logging, every request gets. [Making Requests](../../the-manual/requests/index.md)
covers the rest.

## 3. The cache keeps one copy of each thing

Look at the cache step in the diagram. The cache doesn't just file away each
response. It pulls out each todo and stores it once, by its `type` and `id`. The
All, Active and Completed lists don't hold three copies of a todo. They hold the
same one.

The records are reactive too: when the cache changes a todo, every template
showing it updates. So change a todo once, and every list shows the change.

## 4. Schemas describe data, and records are read-only

Open `app/data/schemas/todo.ts`:

```ts
export const TodoSchema = withDefaults({
  type: 'todo',
  fields: [
    { name: 'title', kind: 'field' },
    { name: 'completed', kind: 'field' },
  ],
});
```

A **resource** is one thing the API returns, such as a single todo, identified
by its `type` and `id`. A schema tells the store which fields a resource type
has. `type: 'todo'` matches the `type` in the API's responses, and
`withDefaults` adds `id`. That's all you write: no model class.

Below the schema, the file declares TypeScript interfaces for the same fields,
such as `Todo`. The schema is what the store uses at runtime, and the interfaces
are what TypeScript checks.

::: tip Try it
Delete the `completed` line from `TodoSchema` and reload. The list disappears,
and the console says `No field named completed on todo`: a record has exactly
the fields its schema declares. Put the line back.
:::

The records you get back are read-only. To change a todo, you edit a copy and
save it, so a half-finished edit never shows up anywhere else.

## Where they meet

`app/data/store.ts` is where you plug in all four:

```ts
export default class Store extends useRecommendedStore({
  cache: JSONAPICache,
  schemas: [TodoSchema],
  handlers: [
    // TODO (chapter 3): add the JSON:API handler
  ],
}) {}
```

`useRecommendedStore` gives you a `Store` with sensible defaults. You supply the
parts that depend on your API: a cache that understands its response format, the
schemas, and the handlers. None of `app/data/` imports Ember. It's plain
TypeScript, so the same data layer works in any framework.

## What's next

Chapter 3 puts the first two ideas to work. Chapter 1's requests don't send the
`Accept` and `Content-Type` headers JSON:API servers expect. And once you can
create todos, the store needs to know which requests to refetch, and nothing
tells it yet. A builder and a handler fix both.
