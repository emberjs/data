---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/legacy/adapter/error/types/ForbiddenError.md
description: >-
  Legacy adapter error for an HTTP 403 response, signaling that the server
  refused a valid request the user lacks permission for.
---

&#x20;

# &#x20;ForbiddenError

```ts
type ForbiddenError = AdapterRequestError<"ForbiddenError">;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:421](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/error.ts#L421)

The [AdapterRequestError](AdapterRequestError.md) shape thrown by the [ForbiddenError](../variables/ForbiddenError.md) constructor.
