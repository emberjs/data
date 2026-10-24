---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/core/reactive/functions/registerDerivations.md
description: >-
  Registers the `@identity` and `@constructor` derivations that schemas built
  with `withDefaults` depend on.
---

# &#x20;registerDerivations()

```ts
function registerDerivations(schema: SchemaService): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:532](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/reactive/-private/schema.ts#L532)

Registers the default derivations for records that want
to use the PolarisMode defaults provided by

```ts
import { withDefaults } from '@warp-drive/core/reactive';
```

The [Derivations](/guides/the-manual/schemas/derivations#about-built-in-derivations)
guide explains when you need to call it.

## Parameters

### schema

[`SchemaService`](../../types/schema/schema-service/types/SchemaService.md)

## Returns

`void`
