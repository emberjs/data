---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/symbols/variables/RequestSignature.md
description: >-
  Type-only symbol key that request builders set on the request they return so
  `store.request()` can infer the response type.
---

# &#x20;RequestSignature

```ts
const RequestSignature: "___(unique) Symbol(RequestSignature)";
```

Defined in: [warp-drive-packages/core/src/types/symbols.ts:107](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/symbols.ts#L107)

Symbol for use by builders to indicate the return type
generic to use for store.request()
