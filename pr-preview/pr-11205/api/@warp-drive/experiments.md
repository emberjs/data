---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/experiments.md
---

&#x20;

:::danger ⚠️ Experimental, use at your own risk
Everything in this package is an experiment we are developing for possible inclusion in
***Warp*Drive**. Nothing here has been through an RFC, and any of it may change or be removed in
a minor release. Read the [Experiments guide](/guides/the-manual/experiments/) before depending on
any of it.
:::

Each experiment is its own entry point.

## Move requests into a `SharedWorker`

* [`data-worker`](/api/@warp-drive/experiments/data-worker/): `DataWorker` wraps a Store that runs
  inside a `SharedWorker`, so fetching and caching happen off the main thread and identical
  requests from several tabs or windows are made only once.
* [`worker-fetch`](/api/@warp-drive/experiments/worker-fetch/): `WorkerFetch` is the request
  handler your app's own Store installs to hand its requests to that `DataWorker`. The two are
  used together.

## Move image loading into a `SharedWorker`

* [`image-worker`](/api/@warp-drive/experiments/image-worker/): `ImageWorker` runs in the worker,
  fetches each image once, and caches an object URL for it.
* [`image-fetch`](/api/@warp-drive/experiments/image-fetch/): `ImageFetch` is the main-thread
  client. Call `load(url)` to get an object URL you can assign to an `<img>`. Used together with
  `image-worker`.

## Persist data in the browser

* [`document-storage`](/api/@warp-drive/experiments/document-storage/): `DocumentStorage` stores
  request documents using the StorageManager API rather than IndexedDB. `DataWorker` uses it as
  its persisted cache.
* [`storage`](/api/@warp-drive/experiments/storage/): reactive key/value resources persisted in
  `localStorage` or `sessionStorage`, for app state rather than request documents.

## Paginate reactively

* [`pagination`](/api/@warp-drive/experiments/pagination/): reactive pagination primitives. The
  implementation lives in `@warp-drive/core`, but the API is published only from here while it is
  experimental. The `<Paginate />` and `<EachLink />` components that build on it are published from
  [`@warp-drive/ember/experiments`](/api/@warp-drive/ember/experiments/).
