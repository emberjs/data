---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/legacy/adapter/error/types/ConflictError.md
description: >-
  Legacy adapter error for an HTTP 409 response, signaling that the request
  conflicts with existing server state, such as a duplicate client-generated id.
---

&#x20;

# &#x20;ConflictError

```ts
type ConflictError = AdapterRequestError<"ConflictError">;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:512](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/adapter/error.ts#L512)

The [AdapterRequestError](AdapterRequestError.md) shape thrown by the [ConflictError](../variables/ConflictError.md) constructor.
