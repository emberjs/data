---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/schema-record.md
---

:::warning ⚠️ This package has been merged into [@warp-drive/core](../core/index.md) and is not recommended for new applications
:::

This package declares nothing of its own. Its single entry point re-exports the
reactive-resource API from [@warp-drive/core/reactive](../core/reactive/index.md)
so existing `@warp-drive/schema-record` imports keep working:

| `@warp-drive/schema-record` export | `@warp-drive/core/reactive` source                                           |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `instantiateRecord`                | [instantiateRecord](../core/reactive/functions/instantiateRecord.md)        |
| `teardownRecord`                   | [teardownRecord](../core/reactive/functions/teardownRecord.md)              |
| `SchemaService`                    | [SchemaService](../core/reactive/classes/SchemaService.md)                |
| `withDefaults`                     | [withDefaults](../core/reactive/functions/withDefaults.md)                  |
| `fromIdentity`                     | [fromIdentity](../core/reactive/variables/fromIdentity.md)                  |
| `registerDerivations`              | [registerDerivations](../core/reactive/functions/registerDerivations.md)    |
| `Checkout`                         | [Checkout](../core/reactive/variables/Checkout.md)                          |
| `Transformation` (type)            | [Transformation](../core/reactive/types/Transformation.md)              |
| `SchemaRecord` (type)              | [ReactiveResource](../core/reactive/types/ReactiveResource.md), renamed |

New code should import these from `@warp-drive/core/reactive` directly.
