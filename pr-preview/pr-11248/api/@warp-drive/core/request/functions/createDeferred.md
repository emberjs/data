---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/request/functions/createDeferred.md
description: >-
  Creates a promise together with its `resolve` and `reject` callbacks so it can
  be handed out before it is settled.
---

# &#x20;createDeferred()

```ts
function createDeferred<T>(): Deferred<T>;
```

Defined in: [warp-drive-packages/core/src/request/-private/future.ts:21](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/request/-private/future.ts#L21)

Create a [Deferred](../types/Deferred.md): a promise along with the `resolve`/`reject`
callbacks that settle it, so the promise can be handed out before the
work that will settle it has started.

## Type Parameters

### T

`T`

## Returns

[`Deferred`](../types/Deferred.md)<`T`>
