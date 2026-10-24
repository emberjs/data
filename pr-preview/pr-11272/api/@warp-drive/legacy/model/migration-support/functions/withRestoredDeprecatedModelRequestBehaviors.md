---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/model/migration-support/functions/withRestoredDeprecatedModelRequestBehaviors.md
---

&#x20;

# &#x20;withRestoredDeprecatedModelRequestBehaviors()

```ts
function withRestoredDeprecatedModelRequestBehaviors(schema: WithPartial<LegacyResourceSchema, "identity" | "legacy">): LegacyResourceSchema;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:391](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L391)

Adds the necessasary fields to the schema for supporting
the deprecated request methods on LegacyMode schemas.

Use this instead of `withDefaults` to add the fields
and behaviors necessary to support Model-Like capabilities.

```ts
import { withRestoredDeprecatedModelRequestBehaviors } from '@warp-drive/legacy/model/migration-support';

export const UserSchema = withRestoredDeprecatedModelRequestBehaviors({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'attribute' },
    { name: 'lastName', kind: 'attribute' },
  ]
});
```

## Parameters

### schema

[`WithPartial`](../../../../core/types/utils/types/WithPartial.md)<[`LegacyResourceSchema`](../../../../core/types/schema/fields/types/LegacyResourceSchema.md), `"identity"` | `"legacy"`>

## Returns

[`LegacyResourceSchema`](../../../../core/types/schema/fields/types/LegacyResourceSchema.md)
