---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/model/migration-support/types/WithLegacy.md
---

&#x20;

# &#x20;WithLegacy\<T *extends* [`TypedRecordInstance`](../../../../core/types/record/types/TypedRecordInstance.md)>

```ts
type WithLegacy<T extends TypedRecordInstance> = T & LegacyModeRecord<T>;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:205](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/model/migration-support.ts#L205)

A Type utility that enables quickly adding type information for the fields
defined by `import { withDefaults } from '@warp-drive/legacy/model/migration-support'`.

Example:

```ts
import { withDefaults, WithLegacy } from '@warp-drive/legacy/model/migration-support';
import { Type } from '@warp-drive/core/types/symbols';
import type { HasMany } from '@@warp-drive/legacy/model';

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

## Type Parameters

### T

`T` *extends* [`TypedRecordInstance`](../../../../core/types/record/types/TypedRecordInstance.md)
