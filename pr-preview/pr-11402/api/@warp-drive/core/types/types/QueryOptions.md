---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/types/QueryOptions.md
description: >-
  Legacy options for `store.query` and `store.queryRecord`, of which only
  `adapterOptions` is used, passed to the adapter rather than the server.
---

# &#x20;QueryOptions

```ts
type QueryOptions = { [K in string | "adapterOptions"]?: K extends "adapterOptions" ? Record<string, unknown> : unknown };
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:76](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/store/-types/q/store.ts#L76)

Options for `store.query()` and `store.queryRecord()`. Unlike
[LegacyResourceQuery](LegacyResourceQuery.md), these options are not sent to the server;
only `adapterOptions` is recognized by the store, and it is passed
through to `adapter.query`/`adapter.queryRecord` via the request snapshot.
