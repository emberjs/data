---
outline:
  level: 2,3
---

# Making Requests

Requests are how your application fetches or updates data stored remotely.

***What Does Remote Mean?***

Most commonly remote data refers to data that is stored on your server and accessed and updated via your backend API.

But it doesn't have to be! Remote really boils down to [persistence](https://en.wikipedia.org/wiki/Persistence_(computer_science)) - the ability for data to be reliably stored someplace so that it can be found again at a later time.

Common examples of persistent or remote data sources that aren't accessed via connecting to a server are the [File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system), browser managed storage mediums such as [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) and [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), or [WebAssembly](https://webassembly.org/) builds of [sqlite3](https://sqlite.org/wasm/doc/trunk/index.md).

<br>
<img class="dark-only" src="../images/requests-dark.png" alt="waves of reactive signals light up space" width="100%">
<img class="light-only" src="../images/requests-light.png" alt="waves of reactive signals light up space" width="100%">

## Request Options

*Warp***Drive** uses the native [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) interfaces for [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) as the foundation upon which requests are made. This ensures that if the platform supports it, WarpDrive exposes it: platform APIs are never hidden away.

::: code-group

```ts [Simple GET]
const { content } = await store.request({
  url: '/api/users'
});
```

```ts [QUERY with POST]
const { content } = await store.request({
  url: '/api/users',
  method: 'POST',
  headers: new Headers({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }),
  body: JSON.stringify({
    filter: {
      $in: { teams: ['1', '9', '42'] }
    },
    search: { name: 'chris' }
  })
});
```

```ts [RPC Style Update]
const { content } = await store.request({
  url: '/actions/like',
  method: 'POST',
  headers: new Headers({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }),
  body: JSON.stringify({
    actor: { type: 'user', id: '1' },
    content: { type: 'comment', id: '42' }
  })
});
```

:::

Of course, writing requests so manually quickly gets repetitive.

***Warp*Drive** offers two abstractions for helping to write organized, reusable requests.

- [Builders](./3-builders.md) - simple functions that produce a json request object
- [Handlers](./4-handlers.md) - middleware that enable enhancing, modifying, or responding to requests

Here's an example of how the requests above could be expressed as builders:

::: code-group

```ts [Simple GET]
function getUsers() {
  return {
    url: '/api/users'
  }
}

const { content } = await store.request(getUsers());
```

```ts [QUERY with POST]
function queryUsers(query) {
  return {
    url: '/api/users',
    method: 'POST',
    headers: new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(query)
  }
}

const { content } = await store.request(
  queryUsers({
    filter: {
      $in: { teams: ['1', '9', '42'] }
    },
    search: { name: 'chris' }
  })
)
```

```ts [RPC Style Update]

function createContentLike(actor, content) {
  return {
    url: '/actions/like',
    method: 'POST',
    headers: new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      actor,
      content
    })
  }
}

const { content } = await store.request(createContentLike({
  actor: { type: 'user', id: '1' },
  content: { type: 'comment', id: '42' }
}));
```

:::

Builders make it easy to quickly write shareable, reusable requests with [typed responses](./2-typing-requests.md) that mirror your application's capabilities and critical business logic.

## Requests Do Not Need To Use Fetch

The native [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) interface provides a convenient, feature-rich way to describe the data you want to retrieve or update – but ultimately request handlers get to decide how that occurs.

Request handlers can be used to connect to any data source via any mechanism. Besides fetch, this might be localStorage, [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest), [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket), [ServerEvents](https://developer.mozilla.org/en-US/docs/Web/API/EventSource), [MessageChannel](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel), or something else entirely!

```ts
import Store from '@ember-data/store';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { // [!code focus:4] [!code ++]
  SessionSettingsHandler, // [!code ++]
  FileSystemHandler // [!code ++]
} from './app/handlers';  // [!code ++]

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([  // [!code focus:5]
      SessionSettingsHandler, // [!code ++]
      FileSystemHandler, // [!code ++]
      Fetch
    ]);

}
```

### The Chain of Responsibility

When we configured the `RequestManager` above, you may have noticed that when we gave it an array of handlers with which to respond to requests.

`RequestManager` follows the [chain-of-responsibility pattern](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern): each handler in our array may choose to respond to the request, modify it, or pass it along unchanged to the next handler in the array, in array order.

<img class="dark-only" src="../images/handlers-all-purple.gif" alt="a flow diagram showing data resolving from server via a chain of request handlers" width="100%">
<img class="light-only" src="../images/handlers-all-light-2.gif" alt="a flow diagram showing data resolving from server via a chain of request handlers" width="100%">
