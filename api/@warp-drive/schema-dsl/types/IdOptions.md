---
url: https://canary.warp-drive.io/api/@warp-drive/schema-dsl/types/IdOptions.md
description: >-
  Options for the `@id` decorator that set the compiled identity field's
  `sourceKey`.
---

# &#x20;IdOptions

```ts
interface IdOptions {
  sourceKey?: string;
}
```

Defined in: [fields/id.ts:11](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/schema-dsl/src/fields/id.ts#L11)

Options accepted by the [id](../functions/id.md) decorator.

## Properties

### sourceKey?

```ts
sourceKey?: string;
```

Defined in: [fields/id.ts:19](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/schema-dsl/src/fields/id.ts#L19)

The name of the identity field as returned by the API, if it differs
from the decorated property's name. Compiles onto the
[IdentityField](../../core/types/schema/fields/types/IdentityField.md)'s `sourceKey`.
