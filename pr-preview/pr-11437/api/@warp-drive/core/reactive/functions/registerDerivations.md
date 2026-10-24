---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/core/reactive/functions/registerDerivations.md
description: >-
  Registers the `@identity` and `@constructor` derivations that schemas built
  with `withDefaults` depend on.
---

# &#x20;registerDerivations()

```ts
function registerDerivations(schema: SchemaService): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:529](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/core/src/reactive/-private/schema.ts#L529)

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
