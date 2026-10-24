---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/reactive/functions/commit.md
description: >-
  Forcibly makes an editable resource's local changes its new remote (immutable)
  state, bypassing a save round-trip.
---

# &#x20;commit()

```ts
function commit(record: ReactiveResource): Promise<void>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/record.ts:828](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/reactive/-private/record.ts#L828)

Forcibly commit all local changes on an editable resource to
the remote (immutable) version.

This covers both fields and relationships: the local state of
every relationship with uncommitted changes becomes its remote
state, and the inverses are updated to match.

This API should only be used cautiously. Typically a better
approach is for either the API or a Handler to reflect saved
changes back to update the cache.

## Parameters

### record

[`ReactiveResource`](../types/ReactiveResource.md)

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
