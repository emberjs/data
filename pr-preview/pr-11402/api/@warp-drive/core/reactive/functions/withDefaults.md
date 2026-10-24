---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/reactive/functions/withDefaults.md
description: >-
  Adds the default `id` identity plus `$key`, `$type`, and `constructor` derived
  fields to a PolarisMode resource schema.
---

# &#x20;withDefaults()

```ts
function withDefaults(schema: WithPartial<PolarisResourceSchema, "identity">): PolarisResourceSchema;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:449](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/reactive/-private/schema.ts#L449)

Utility for constructing a ResourceSchema with the recommended
fields for the PolarisMode experience.

The [ResourceSchemas](/guides/the-manual/schemas/resources/) guide shows how to
create a schema with it.

Using this requires registering the PolarisMode derivations

```ts
import { registerDerivations } from '@warp-drive/core/reactive';

registerDerivations(schema);
```

## Parameters

### schema

[`WithPartial`](../../types/utils/types/WithPartial.md)<[`PolarisResourceSchema`](../../types/schema/fields/types/PolarisResourceSchema.md), `"identity"`>

## Returns

[`PolarisResourceSchema`](../../types/schema/fields/types/PolarisResourceSchema.md)
