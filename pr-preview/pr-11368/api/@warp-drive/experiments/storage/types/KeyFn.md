---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/experiments/storage/types/KeyFn.md
description: >-
  Experimental function type that derives a unique storage key from a storage
  resource instance, so each instance persists its own data.
---

&#x20;

# &#x20;KeyFn

```ts
type KeyFn = (obj: any) => string;
```

Defined in: [warp-drive-packages/experiments/src/storage/-private/storage-infra.ts:46](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/experiments/src/storage/-private/storage-infra.ts#L46)

A function which generates a unique primary-key
string for a given LocalResource or SessionResource
instance.

Use functions when you want to create more than
one instance of a resource type, each with its own
persisted data.

## Parameters

### obj

`any`

## Returns

`string`
