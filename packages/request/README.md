<p align="center">
  <img
    class="project-logo"
    src="./ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData RequestManager"
    width="240px"
    title="EmberData RequestManager"
    />
  <img
    class="project-logo"
    src="./ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData RequestManager"
    width="240px"
    title="EmberData RequestManager"
    />
</p>

<p align="center">⚡️ a simple abstraction over fetch to enable easy management of request/response flows</p>

This package provides [*Ember***Data**](https://github.com/emberjs/data/)'s `RequestManager`, a standalone library that can be integrated with any Javascript application to make [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) happen.

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/request
```

## 🚀 Basic Usage

A `RequestManager` provides a request/response flow in which configured handlers are successively given the opportunity to handle, modify, or pass-along a request.

The RequestManager on its own does not know how to fulfill requests. For this we must register at least one handler. A basic `Fetch` handler is provided that will take the request options provided and execute `fetch`.

```ts
import RequestManager, { Fetch } from '@ember-data/request';
import { apiUrl } from './config';

// ... create manager and add our Fetch handler
const manager = new RequestManager();
manager.use([Fetch]);

// ... execute a request
const response = await manager.request({
  url: `${apiUrl}/users`
});
```


## 🪜 Architecture

A `RequestManager` may be used standalone from the rest of *Ember***Data**.

```mermaid
flowchart LR
    A[fa:fa-terminal App] <--> B{{fa:fa-sitemap RequestManager}}
    B <--> C[(fa:fa-database Source)]
```

The same or a separate instance of a `RequestManager` may also be used to fulfill requests issued by [*Ember***Data**{Store}](https://github.com/emberjs/data/tree/master/packages/store)

```mermaid
flowchart LR
    A[fa:fa-terminal App] <--> D{fa:fa-code-fork Store}
    B{{fa:fa-sitemap RequestManager}} <--> C[(fa:fa-database Source)]
    D <--> E[(fa:fa-archive Cache)]
    D <--> B
    click D href "https://github.com/emberjs/data/tree/master/packages/store" "Go to @ember-data/store" _blank
    click E href "https://github.com/emberjs/data/tree/master/packages/record-data" "Go to @ember-data/record-data" _blank
    style D color:#58a6ff;
    style E color:#58a6ff;
```

When the same instance is used by both this allows for simple coordination throughout the application. Requests issued by the Store will use the in-memory cache
and return hydrated responses, requests issued directly to the RequestManager
will skip the in-memory cache and return raw responses.

```mermaid
flowchart LR
    A[fa:fa-terminal App] <--> B{{fa:fa-sitemap RequestManager}}
    B <--> C[(fa:fa-database Source)]
    A <--> D{fa:fa-code-fork Store}
    D <--> E[(fa:fa-archive Cache)]
    D <--> B
    click D href "https://github.com/emberjs/data/tree/master/packages/store" "Go to @ember-data/store" _blank
    click E href "https://github.com/emberjs/data/tree/master/packages/record-data" "Go to @ember-data/record-data" _blank
    style D color:#58a6ff;
    style E color:#58a6ff;
```

## Usage

### Making Requests

`RequestManager` has a single asyncronous method as it's API: `request`

```ts
class RequestManager {
  async request<T>(req: RequestInfo): Future<T>;
}
```

`manager.request` accepts a `RequestInfo`, an object containing the information
necessary for the request to be handled successfully.

`RequestInfo` extends the [options](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters) provided to `fetch`, and can accept a [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request). All properties accepted by Request options and fetch options are valid on `RequestInfo`.

```ts
interface RequestInfo extends FetchOptions {
  url: string;
  /**
   * data that a handler should convert into 
   * the query (GET) or body (POST)
   */
  data?: Record<string, unknown>;
  /**
   * options specifically intended for handlers
   * to utilize to process the request
   */
  options?: Record<string, unknown>;
}
```

> **note:** providing a `signal` is unnecessary as an `AbortController` is automatically provided if none is present.

`manager.request` returns a `Future`, which allows access to limited information about the request while it is still pending and fulfills with the final state when the request completes and the response has been read.

A `Future` is cancellable via `abort`.

Handlers may *optionally* expose a ReadableStream to the `Future` for streaming data; however, when doing so the handler should not resolve until it has fully read the response stream itself.

```ts
interface Future<T> extends Promise<StructuredDocument<T>> {
  abort(): void;

  async getStream(): ReadableStream | null;
}
```

A Future resolves or rejects with a `StructuredDocument`.

```ts
interface StructuredDocument<T> {
  request: RequestInfo;
  response: {
    status: HTTPStatusCode;
    headers: Record<string, string>;
  }
  data?: T;
  error?: Error;
}
```

The `RequestInfo` specified by `document.request` is the same as originally provided to `manager.request`. If any handler fulfilled this request using different request info it is not represented here. This contract helps to ensure that `retry` and `caching` are possible since the original arguments are correctly preserved. This also allows handlers to "fork" the request or fulfill from multiple sources without the details of fulfillment muddying the original request.


### Handling Requests

Requests are fulfilled by handlers. A handler receives the request context
as well as a `next` function with which to pass along a request to the next
handler if it so chooses.

A handler may be any object with a `request` method. This allows both stateful and non-stateful
handlers to be utilized.

If a handler calls `next`, it receives a `Future` which resolves to a `StructuredDocument`
that it can then compose how it sees fit with its own response.

```ts

type NextFn<P> = (req: RequestInfo) => Future<P>;

interface Handler<T> {
  async request(context: RequestContext, next: NextFn<P>): T;
}
```

`RequestContext` contains a readonly version of the RequestInfo as well as a few methods for building up the `StructuredDocument` and `Future` that will be part of the response.

```ts
interface RequestContext<T> {
  readonly request: RequestInfo;

  setStream(stream: ReadableStream | Promise<ReadableStream>): void;
  setResponse(response: Response): void;
}
```

A basic `fetch` handler with support for streaming content updates while
the download is still underway might look like the following, where we use
[`response.clone()`](https://developer.mozilla.org/en-US/docs/Web/API/Response/clone) to `tee` the `ReadableStream` into two streams.

A more efficient handler might read from the response stream, building up the 
response data before passing along the chunk downstream.

```ts
const FetchHandler = {
  async request(context) {
    const response = await fetch(context.request);
    context.setResponse(reponse);
    context.setStream(response.clone().body);

    return response.json();
  }
}
```

Request handlers are registered by configuring the manager via `use`

```ts
manager.use([Handler1, Handler2])
```

Handlers will be invoked in the order they are registered ("fifo", first-in first-out), and may only be registered up until the first request is made. It is recommended but not required to register all handlers at one time in order to ensure explicitly visible handler ordering.

---

**Stream Currying**

`RequestManager.request` and `next` differ from `fetch` in one **crucial detail** in that the outer Promise resolves only once the response stream has been processed.

For context, it helps to understand a few of the use-cases that RequestManager
is intended to allow.

- to manage and return streaming content (such as video files)
- to fulfill a request from multiple sources or by splitting one request into multiple requests
  - for instance one API call for a user and another for the user's friends
  - or e.g. fulfilling part of the request from one source (one API, in-memory, localStorage, IndexedDB
   etc.) and the rest from another source (a different API, a WebWorker, etc.)
- to coalesce multiple requests
- to decorate a request with additional info
    - e.g. an Auth handler that ensures the correct tokens or headers or cookies are attached.

`await fetch(<req>)` resolves at the moment headers are received. This allows for the body of the request to be processed as a stream by application
code *while chunks are still being received by the browser*.

When an app chooses to `await response.json()` what occurs is the browser reads the stream to completion and then returns the result. Additionally, this stream may only be read **once**.

The `RequestManager` preserves this ability to subscribe to and utilize the stream by either the application or the handler – thereby delivering the full power and flexibility of native APIs – without restricting developers in ways that lead to complicated workarounds.

Each handler may call `setStream` only once, but may do so *at any time* until the promise that the handler returns has resolved. The associated promise returned by calling `future.getStream` will resolve with the stream set by `setStream` if that method is called, or `null` if that method
has not been called by the time that the handler's request method has resolved.

Handlers that do not create a stream of their own, but which call `next`, should defensively pipe the stream forward. While this is not required (see automatic currying below) it is better to do so in most cases as otherwise the stream may not become available to downstream handlers or the application until the upstream handler has fully read it.

```ts
context.setStream(future.getStream());
```

Handlers that either call `next` multiple times or otherwise have reason to create multiple  fetch requests should either choose to return no stream, meaningfully combine the streams, or select a single prioritized stream.

Of course, any handler may choose to read and handle the stream, and return either no stream or a different stream in the process.

**Automatic Currying of Stream and Response**

In order to simplify the common case for handlers which decorate a request, if `next` is called only a single time and `setResponse` was never called by the handler, the response set by the next handler in the chain will be applied to that handler's outcome. For instance, this makes the following pattern possible `return (await next(<req>)).data;`.

Similarly, if `next` is called only a single time and neither `setStream` nor `getStream` was called, we automatically curry the stream from the future returned by `next` onto the future returned by the handler.

Finally, if the return value of a handler is a `Future`, we curry `data` and `errors` as well, thus enabling the simplest form `return next(<req>)`.

In the case of the `Future` being returned, `Stream` proxying is automatic and immediate and does not wait for the `Future` to resolve.

## Usage With `@ember-data/store`