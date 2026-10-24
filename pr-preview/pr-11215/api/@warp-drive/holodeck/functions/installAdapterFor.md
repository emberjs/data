---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/holodeck/functions/installAdapterFor.md
description: >-
  Patches a legacy store so its adapters send `_fetchRequest` calls through the
  Holodeck mock server for the given test context.
---

# &#x20;installAdapterFor()

```ts
function installAdapterFor(owner: object, store: Store$1): void;
```

Defined in: [index.ts:426](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/packages/holodeck/src/index.ts#L426)

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
