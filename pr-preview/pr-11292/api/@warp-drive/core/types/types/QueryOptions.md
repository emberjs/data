---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/types/QueryOptions.md
---

# &#x20;QueryOptions

```ts
type QueryOptions = { [K in string | "adapterOptions"]?: K extends "adapterOptions" ? Record<string, unknown> : unknown };
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:67](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/store/-types/q/store.ts#L67)

Options for `store.query()` and `store.queryRecord()`. Unlike
[LegacyResourceQuery](LegacyResourceQuery.md), these options are not sent to the server;
only `adapterOptions` is recognized by the store, and it is passed
through to `adapter.query`/`adapter.queryRecord` via the request snapshot.
