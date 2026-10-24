---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/holodeck/functions/installAdapterFor.md
description: >-
  Patches a legacy store so its adapters send `_fetchRequest` calls through the
  Holodeck mock server for the given test context.
---

# &#x20;installAdapterFor()

```ts
function installAdapterFor(owner: object, store: Store$1): void;
```

Defined in: [index.ts:426](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/packages/holodeck/src/index.ts#L426)

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
