---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/symbols/variables/RecordStore.md
description: >-
  Internal symbol key under which a record instance keeps a reference to the
  store that owns it.
---

# &#x20;RecordStore

```ts
const RecordStore: "___(unique) Symbol(Store)";
```

Defined in: [warp-drive-packages/core/src/types/symbols.ts:18](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/symbols.ts#L18)

Symbol used internally to stash a reference to the owning
[Store](../../../classes/Store.md) on a record instance.
