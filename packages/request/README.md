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

<p align="center">⚡️ a simple abstraction over [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to enable easy management of request/response flows</p>

This package provides [*Ember***Data**](https://github.com/emberjs/data/)'s `RequestManager`, a standalone library that can be integrated with any Javascript application to make fetch happen.

### How It Fits

A `RequestManager` may be used standalone from the rest of *Ember***Data**.

```mermaid
flowchart LR
    A[App] <--> B(RequestManager)
    B <--> C(Source)
```

The same or a separate `RequestManager` may also be used to fulfill requests issued by [*Ember***Data**{Store}](https://github.com/emberjs/data/tree/master/packages/store)

```mermaid
flowchart LR
    A[App] <--> D{Store}
    B(RequestManager) <--> C(Source)
    D <--> E(Cache)
    D <--> B
```

When the same instance is used by both this allows for simple coordination throughout the application. Requests issued by the Store will use the in-memory cache
and return hydrated responses, requests issued directly to the RequestManager
will skip the in-memory cache and return raw responses.

```mermaid
flowchart LR
    A[App] <--> B(RequestManager)
    B <--> C(Source)
    A <--> D{Store}
    D <--> E(Cache)
    D <--> B
```

## Usage

A `RequestManager` provides a request/response flow in which configured handlers are successively given the opportunity to handle, modify, or pass-along a request.

```ts
interface RequestManager {
  async request<T>(req: RequestInfo): Future<T>;
}
```
