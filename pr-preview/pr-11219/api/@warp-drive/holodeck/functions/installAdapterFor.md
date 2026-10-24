---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/holodeck/functions/installAdapterFor.md
description: >-
  Patches a legacy store so its adapters send `_fetchRequest` calls through the
  Holodeck mock server for the given test context.
---

# &#x20;installAdapterFor()

```ts
function installAdapterFor(owner: object, store: Store$1): void;
```

Defined in: [index.ts:426](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/packages/holodeck/src/index.ts#L426)

Creates an adapterFor function that wraps the provided adapterFor function
to override the adapter's \_fetchRequest method to route requests through
the Holodeck mock server.

## Parameters

### owner

`object`

The test context object used to retrieve the test ID.

### store

`Store$1`

## Returns

`void`
