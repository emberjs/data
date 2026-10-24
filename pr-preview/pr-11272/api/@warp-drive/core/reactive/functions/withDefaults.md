---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/reactive/functions/withDefaults.md
---

# &#x20;withDefaults()

```ts
function withDefaults(schema: WithPartial<PolarisResourceSchema, "identity">): PolarisResourceSchema;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:449](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/schema.ts#L449)

Utility for constructing a ResourceSchema with the recommended
fields for the PolarisMode experience.

Adds the following fields:

* `id` as the identity field, unless another identity is supplied
* `$key` the [ResourceKey](../../types/identifier/types/ResourceKey.md) for the resource
* `$type` the resource's type
* `$state` the resource's reactive lifecycle state, see [ReactiveResourceState](../types/ReactiveResourceState.md)
* `constructor` a minimal stand-in for debugging tools

Using this requires registering the PolarisMode derivations

```ts
import { registerDerivations } from '@warp-drive/schema-record';

registerDerivations(schema);
```

## Parameters

### schema

[`WithPartial`](../../types/utils/types/WithPartial.md)<[`PolarisResourceSchema`](../../types/schema/fields/types/PolarisResourceSchema.md), `"identity"`>

## Returns

[`PolarisResourceSchema`](../../types/schema/fields/types/PolarisResourceSchema.md)
