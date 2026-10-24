---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/reactive/functions/registerDerivations.md
---

# &#x20;registerDerivations()

```ts
function registerDerivations(schema: SchemaService): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:508](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/reactive/-private/schema.ts#L508)

Registers the default derivations for records that want
to use the PolarisMode defaults provided by

```ts
import { withDefaults } from '@warp-drive/schema-record';
```

## Parameters

### schema

[`SchemaService`](../../types/schema/schema-service/types/SchemaService.md)

## Returns

`void`
