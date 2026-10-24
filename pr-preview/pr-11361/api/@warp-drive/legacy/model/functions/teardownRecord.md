---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/legacy/model/functions/teardownRecord.md
description: >-
  Legacy store hook that destroys a `Model` instance when the store releases its
  record.
---

&#x20;

# &#x20;teardownRecord()

```ts
function teardownRecord(record: Model): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/hooks.ts:59](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/legacy/src/model/-private/hooks.ts#L59)

The `teardownRecord` hook implementation for use with `Model`. Pass this
to your store's `teardownRecord` method when configuring the store to
use `Model` for schema/record instantiation.

## Parameters

### record

[`Model`](../classes/Model.md)

## Returns

`void`
