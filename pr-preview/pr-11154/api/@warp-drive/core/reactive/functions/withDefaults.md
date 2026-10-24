---
url: /pr-preview/pr-11154/api/@warp-drive/core/reactive/functions/withDefaults.md
---

# &#x20;withDefaults()

```ts
function withDefaults(schema: WithPartial<PolarisResourceSchema, "identity">): PolarisResourceSchema;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:435](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/reactive/-private/schema.ts#L435)

Utility for constructing a ResourceSchema with the recommended
fields for the PolarisMode experience.

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
