## Requests

Requests are how your application fetches data from a source or asks the source to update data to a new state.

*Warp***Drive** uses the native interfaces for [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) as the foundation upon which it layers features for fulfilling requests.

Sources can be anything that has the ability for you to store and retrieve data: for example your API, the file system, or IndexedDB.

Though the actual source and connection type do not matter, in a typical app requests are fulfilled by making [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) calls against server endpoints making up an API.

### Fetch Example

<br>

*Run This Example* → [Request | Fetch Example](https://warpdrive.nullvoxpopuli.com/manual/requests/fetch)

<br>

In order to make requests, first we create a request manager for our
application, and we tell it to fulfill requests using the `Fetch` handler.

```ts
import RequestManager from '@ember-data/request';
import { Fetch } from '@ember-data/request/fetch';

const manager = new RequestManager().use([Fetch]);
```

Now we can issue a request for a list of our users:

```ts
const { content } = await manager.request({ url: '/users' });

for (const user of content.data) {
  greet(`${user.firstName} ${user.lastName}`);
}
```

If we wanted to type the above request, we could supply a type for the
content returned by the request:

```ts
type User = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
};

type UsersQuery = {
  data: User[];
}
```

And use it like this:

```ts
const { content } = await manager.request<UsersQuery>({ url: '/users' });
```

> [!TIP]
> Manually supplying the generic is NOT the preferred way
> to type a request, look for the section on [builders]()
> later.

### The Chain of Responsibility

When we created the request manager for our application above, you may have noticed that when we told it to fulfill requests using the `Fetch` handler we did so by passing in an array:

```ts
new RequestManager().use([Fetch]);
```

The request manager follows the [chain-of-responsibility pattern](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern): each handler in our array may choose to fulfill the request, modify it, or pass it along unchanged to the next handler in the array, in array order.


```mermaid
---
config:
  theme: neutral
---
flowchart LR
    C(Handler 1)
    C <==> D(Handler 2)
    D <==> E(Handler 3)
    C <--> F@{ shape: lin-cyl, label: "Source A" }
    D <--> G@{ shape: lin-cyl, label: "Source B" }
    E <--> H@{ shape: lin-cyl, label: "Source C" }
```

### Handlers

Requests are fulfilled by handlers. A handler receives the RequestContext as well as a `next` function with which to pass along a request to the next handler if it so chooses.

```ts
type NextFn<T> = (req: RequestInfo) => Future<T>;

type Handler = {
  request<T>(context: RequestContext, next: NextFn<T>): Promise<T> | Future<T>;
}
```

A handler may be any object with a `request` method. This allows both stateful and non-stateful handlers to be utilized.

### Creating Great Handlers

Handlers should take care of the most generalizable concerns
