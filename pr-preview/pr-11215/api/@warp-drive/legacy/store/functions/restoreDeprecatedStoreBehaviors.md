---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/legacy/store/functions/restoreDeprecatedStoreBehaviors.md
description: >-
  Legacy opt-in that restores the adapter-based `findRecord`, `findAll`,
  `query`, `saveRecord`, and related methods onto a `Store` class.
---

&#x20;

# &#x20;restoreDeprecatedStoreBehaviors()

```ts
function restoreDeprecatedStoreBehaviors(StoreKlass: typeof Store$1): void;
```

Defined in: [warp-drive-packages/legacy/src/store.ts:43](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/store.ts#L43)

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
