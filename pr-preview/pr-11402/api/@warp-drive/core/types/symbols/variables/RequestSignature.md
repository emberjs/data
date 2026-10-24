---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/symbols/variables/RequestSignature.md
description: >-
  Type-only symbol key that request builders set on the request they return so
  `store.request()` can infer the response type.
---

# &#x20;RequestSignature

```ts
const RequestSignature: "___(unique) Symbol(RequestSignature)";
```

Defined in: [warp-drive-packages/core/src/types/symbols.ts:107](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/symbols.ts#L107)

Symbol for use by builders to indicate the return type
generic to use for store.request()
