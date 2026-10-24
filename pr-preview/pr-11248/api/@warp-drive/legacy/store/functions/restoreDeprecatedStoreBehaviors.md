---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/legacy/store/functions/restoreDeprecatedStoreBehaviors.md
description: >-
  Legacy opt-in that restores the adapter-based `findRecord`, `findAll`,
  `query`, `saveRecord`, and related methods onto a `Store` class.
---

&#x20;

# &#x20;restoreDeprecatedStoreBehaviors()

```ts
function restoreDeprecatedStoreBehaviors(StoreKlass: typeof Store$1): void;
```

Defined in: [warp-drive-packages/legacy/src/store.ts:43](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/legacy/src/store.ts#L43)

Restores the deprecated `findRecord`/`findAll`/`query`/`queryRecord`/
`findBelongsTo`/`findHasMany`/`createRecord`/`deleteRecord`/`saveRecord`
legacy-network-layer implementations of these methods onto the given
`Store` subclass, for apps that have not yet migrated to the
`RequestManager`-based equivalents.

## Parameters

### StoreKlass

*typeof* `Store$1`

## Returns

`void`
