---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/schema-dsl/types/IdOptions.md
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

Defined in: [fields/id.ts:11](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/fields/id.ts#L11)

Options accepted by the [id](../functions/id.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/id.ts:19](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/fields/id.ts#L19)

The name of the identity field as returned by the API, if it differs
from the decorated property's name. Compiles onto the
[IdentityField](../../core/types/schema/fields/types/IdentityField.md)'s `sourceKey`.
