---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/reactive/functions/teardownRecord.md
---

# &#x20;teardownRecord()

```ts
function teardownRecord(record: unknown): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/hooks.ts:60](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/reactive/-private/hooks.ts#L60)

The store's default `teardownRecord` hook implementation, which asserts
that `record` is a [ReactiveResource](../types/ReactiveResource.md) and invokes its `Destroy`
behavior.

## Parameters

### record

`unknown`

## Returns

`void`
