---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/legacy/model/migration-support/functions/withDefaults.md
---

&#x20;

# &#x20;withDefaults()

```ts
function withDefaults(schema: WithPartial<LegacyResourceSchema, "identity" | "legacy">): LegacyResourceSchema;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:338](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model/migration-support.ts#L338)

A function which adds the necessary fields to a schema and marks it as
being in LegacyMode. This is used to support the legacy features of
@warp-drive/legacy/model while migrating to WarpDrive.

Example:

```ts
import { withDefaults, WithLegacy } from '@warp-drive/legacy/model/migration-support';
import { Type } from '@warp-drive/core/types/symbols';
import type { HasMany } from '@warp-drive/legacy/model';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'attribute' },
    { name: 'lastName', kind: 'attribute' },
    { name: 'age', kind: 'attribute' },
    { name: 'friends',
      kind: 'hasMany',
      type: 'user',
      options: { inverse: 'friends', async: false }
    },
    { name: 'bestFriend',
      kind: 'belongsTo',
      type: 'user',
      options: { inverse: null, async: false }
    },
  ],
});

export type User = WithLegacy<{
  firstName: string;
  lastName: string;
  age: number;
  friends: HasMany<User>;
  bestFriend: User | null;
  [Type]: 'user';
}>
```

Using this function require registering the derivations
it requires with the schema service.

```ts
import { registerDerivations } from '@warp-drive/legacy/model/migration-support';

registerDerivations(schema);
```

## Parameters

### schema

[`WithPartial`](../../../../core/types/utils/types/WithPartial.md)<[`LegacyResourceSchema`](../../../../core/types/schema/fields/types/LegacyResourceSchema.md), `"identity"` | `"legacy"`>

The schema to add legacy support to.

## Returns

[`LegacyResourceSchema`](../../../../core/types/schema/fields/types/LegacyResourceSchema.md)

The schema with legacy support added.
