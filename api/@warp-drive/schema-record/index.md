---
url: https://canary.warp-drive.io/api/@warp-drive/schema-record.md
description: >-
  (Legacy) Re-export of the reactive-resource API such as `SchemaService`,
  `instantiateRecord` and `withDefaults`; new code should import these from
  `@warp-drive/core/reactive`.
---

&#x20;

:::warning Legacy package
`@warp-drive/schema-record` is a legacy package. New code should use [`@warp-drive/core/reactive`](/api/@warp-drive/core/reactive/) instead.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
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
