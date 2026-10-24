---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/guides/the-manual/requests/using-just-fetch.md
description: >-
  Make requests with a standalone RequestManager and the Fetch handler without a
  Store, and know what you give up by skipping the Store's cache.
---

# Using "Just Fetch"

Throughout this guide we've shown usage of the [`RequestManager`](/api/@warp-drive/core/classes/RequestManager) in context of a [`Store`](/api/@warp-drive/core/classes/Store).

::: code-group

```ts [Setup]
import { Store, CacheHandler, RequestManager, Fetch } from '@warp-drive/core';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

}
```

```ts [Usage]
store.request({ url: '/users' })
```

:::

This is because most applications will want access to features only available when
using the store such as reactive-data, advanced caching, and relational mapping.

Out of the box, the entire ***Warp*Drive** experience is optimized to be small and
fast. However, if all your application needs is a pipeline to help you manage requests
in a conventional way (or that plus reactive promise states / reactive control flow) then
its possible to use an even more minimal ***Warp*Drive** setup.

This guide covers how to do so.

## Creating a RequestManager Without a Store

A `RequestManager` does not need a `Store`, and
it is not specific to any library or framework. On its own it does not know how to fulfill a
request, so register at least one handler with
[use](/api/@warp-drive/core/classes/RequestManager#use). The
[Fetch](/api/@warp-drive/core/variables/Fetch) handler executes `fetch` with the request
options you give it.

Most apps need only one manager. Create it once and export it from a module:

```ts [app/fetch.ts]
import { RequestManager, Fetch } from '@warp-drive/core';

const manager = new RequestManager().use([Fetch]);

export default manager;
```

Then make requests with it the same way you would with `store.request`:

```ts
import manager from './fetch';

const { content } = await manager.request({ url: '/api/users' });
```

The request accepts the same [request options](./index.md#request-options) as `store.request`,
and [builders](./builders.md) work with it too. The [`Future`](/api/@warp-drive/core/request/types/Future) it returns has the same `abort()`
and `getStream()` described in [Using The Response](./using-the-response.md), and you can pass
it to [`getRequestState`](/api/@warp-drive/core/reactive/functions/getRequestState) for [reactive control flow](./index.md#reactive-control-flow).

```ts
const future = manager.request({ url: '/api/users' });

// later, if the result is no longer needed
future.abort();
```

For a complete walk-through, including JSON:API builders, pagination links and error handling,
see [Basic Usage](../cookbook/basic-usage.md) in the Cookbook.

## What You Give Up Without the Store

Without a `Store` there is no cache, so:

* `content` is whatever the last handler in the chain returns. For `Fetch` that is the response
  body parsed as JSON, not a [ReactiveDocument](/api/@warp-drive/core/reactive/types/ReactiveDocument).
* Requests are never deduplicated or resolved from the cache, however often you make them.
* The same resource in two responses is two separate objects, not one shared record.
  [Resource caching](../caching/index.md#resource-caching) is what merges them.
* Relationships between resources in different responses are not connected, since there is no
  [relationship graph](../relational-data/index.md) to connect them.
* Content never updates itself. A later request, or a change your app makes, does not change the
  objects an earlier request returned, because nothing is
  [reactive](../reactivity/index.md) without the cache.
* There is no [CachePolicy](../caching/index.md#determining-the-cachekey-and-checking-if-the-response-is-stale),
  so nothing checks whether a response is stale or reloads it in the background, and
  `cacheOptions` such as `reload` and `backgroundReload` have no effect.
* Local changes are not tracked. The cache keeps
  [edits separate from the data the server sent](../caching/index.md#what-about-mutation) so they
  can be committed or discarded; a plain object just holds whatever you assign to it.

The `Future` still works as described above: you can `abort()` it, read its stream and pass it
to `getRequestState`, which accepts any `Future`, not only one from `store.request`.

This also applies when the same `RequestManager` is shared with a `Store`, including calling
`store.requestManager.request` directly. The [`CacheHandler`](/api/@warp-drive/core/variables/CacheHandler) only handles requests that carry a
`store`, and `store.request` is what adds it. Requests made directly with `manager.request`
pass through the `CacheHandler` untouched, as described in
[Determining If A Request Can Use The Cache](../caching/index.md#determining-if-a-request-can-use-the-cache).

## Writing Your Own Handlers

Any handler you register with `use` runs for a standalone manager just as it does for a
`Store`'s manager.

* [Handlers](./handlers.md) shows how to write one that transforms a response.
* [Auth Handlers](../cookbook/auth-handlers.md) shows how to add an auth header to every
  request.
* [Advanced Handlers](./handlers-advanced.md) explains what a handler receives and returns,
  handler order, passing responses and streams along the chain, retrying errors and handling
  abort.
