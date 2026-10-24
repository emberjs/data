---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/legacy/adapter/error/types/ForbiddenError.md
description: >-
  Legacy adapter error for an HTTP 403 response, signaling that the server
  refused a valid request the user lacks permission for.
---

&#x20;

# &#x20;ForbiddenError

```ts
type ForbiddenError = AdapterRequestError<"ForbiddenError">;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:421](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/legacy/src/adapter/error.ts#L421)

The [AdapterRequestError](AdapterRequestError.md) shape thrown by the [ForbiddenError](../variables/ForbiddenError.md) constructor.
