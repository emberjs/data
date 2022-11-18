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
