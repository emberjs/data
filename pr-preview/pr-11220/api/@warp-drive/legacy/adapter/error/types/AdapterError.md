---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/legacy/adapter/error/types/AdapterError.md
description: >-
  Legacy base error an adapter returns or throws to signal a failed API request;
  extend it to define app-specific error types.
---

&#x20;

# &#x20;AdapterError

```ts
type AdapterError = AdapterRequestError<"AdapterError">;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:89](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/adapter/error.ts#L89)

The [AdapterRequestError](AdapterRequestError.md) shape thrown by the [AdapterError](../variables/AdapterError.md) constructor.
