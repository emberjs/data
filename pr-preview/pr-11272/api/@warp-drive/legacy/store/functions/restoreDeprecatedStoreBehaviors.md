---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/store/functions/restoreDeprecatedStoreBehaviors.md
---

&#x20;

# &#x20;restoreDeprecatedStoreBehaviors()

```ts
function restoreDeprecatedStoreBehaviors(StoreKlass: typeof Store$1): void;
```

Defined in: [warp-drive-packages/legacy/src/store.ts:34](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/store.ts#L34)

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
