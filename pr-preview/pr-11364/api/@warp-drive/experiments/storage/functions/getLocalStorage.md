---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/experiments/storage/functions/getLocalStorage.md
description: >-
  Experimental function that returns the shared reactive wrapper around
  localStorage, creating it on first call.
---

&#x20;

# &#x20;getLocalStorage()

```ts
function getLocalStorage(): ReactiveStorage;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:43](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/experiments/src/storage/storage.ts#L43)

Retrieves the singleton instance of the LocalStorage service.

If the instance does not already exist, it is created.

## Returns

[`ReactiveStorage`](../types/ReactiveStorage.md)
