---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/legacy/adapter/error/types/ServerError.md
description: >-
  Legacy adapter error for an HTTP 500 response, signaling that the API failed
  internally and an immediate retry is unlikely to succeed.
---

&#x20;

# &#x20;ServerError

```ts
type ServerError = AdapterRequestError<"ServerError">;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:555](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/legacy/src/adapter/error.ts#L555)

The [AdapterRequestError](AdapterRequestError.md) shape thrown by the [ServerError](../variables/ServerError.md) constructor.
