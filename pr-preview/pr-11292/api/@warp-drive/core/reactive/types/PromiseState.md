---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/types/PromiseState.md
---

# &#x20;PromiseState\<T = `unknown`, E = `unknown`>

```ts
type PromiseState<T = unknown, E = unknown> = 
  | PendingPromise
  | ResolvedPromise<T>
| RejectedPromise<E>;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:232](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L232)

The state of a promise. This is the type that is returned
from `getPromiseState`.

See also:

* [PendingPromise](PendingPromise.md)
* [ResolvedPromise](ResolvedPromise.md)
* [RejectedPromise](RejectedPromise.md)

## Type Parameters

### T

`T` = `unknown`

### E

`E` = `unknown`
