---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/core/types/StoreRequestInput.md
description: >-
  The request object `store.request` accepts, either a full immutable request
  info or a looser form with plain `records` and `headers`.
---

# &#x20;StoreRequestInput\<RT = `unknown`>

```ts
type StoreRequestInput<RT = unknown> = 
  | ImmutableRequestInfo<RT>
| LooseStoreRequestInfo<RT>;
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/handler.ts:50](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/core/src/store/-private/cache-handler/handler.ts#L50)

The request shape accepted by [Store.request](../classes/Store.md#request), either a fully-formed
[ImmutableRequestInfo](request/types/ImmutableRequestInfo.md) or the looser LooseStoreRequestInfo.

## Type Parameters

### RT

`RT` = `unknown`
