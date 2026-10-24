---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/utilities/handlers/variables/TAB_ID.md
description: >-
  Random UUID identifying the current browser tab, kept in `sessionStorage`
  across reloads, for request tracing.
---

# &#x20;TAB\_ID

```ts
const TAB_ID: string;
```

Defined in: [-private/handlers/utils.ts:38](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/utilities/src/-private/handlers/utils.ts#L38)

A unique identifier for the current browser tab
useful for observability/tracing and deduping
across multiple tabs.
