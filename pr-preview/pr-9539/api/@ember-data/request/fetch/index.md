---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@ember-data/request/fetch.md
description: >-
  Legacy entry re-exporting `Fetch`, a request handler that sends each request
  with `fetch` and parses the response as JSON.
---

&#x20;

:::warning Legacy package
`@ember-data/request` is a legacy package. New code should use [`@warp-drive/core`](/api/@warp-drive/core/) instead.
:::

A basic Fetch Handler which converts a request into a
`fetch` call presuming the response to be `json`.

```ts
import Fetch from '@ember-data/request/fetch';

manager.use([Fetch]);
```
