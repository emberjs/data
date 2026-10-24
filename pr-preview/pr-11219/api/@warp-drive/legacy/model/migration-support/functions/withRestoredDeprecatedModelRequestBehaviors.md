---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/legacy/model/migration-support/functions/withRestoredDeprecatedModelRequestBehaviors.md
description: >-
  Legacy alternative to `withDefaults` that makes a LegacyMode schema whose
  `save`, `reload`, and `destroyRecord` run without deprecation warnings.
---

&#x20;

# &#x20;withRestoredDeprecatedModelRequestBehaviors()

```ts
function withRestoredDeprecatedModelRequestBehaviors(schema: WithPartial<LegacyResourceSchema, "identity" | "legacy">): LegacyResourceSchema;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:403](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/legacy/src/model/migration-support.ts#L403)

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
