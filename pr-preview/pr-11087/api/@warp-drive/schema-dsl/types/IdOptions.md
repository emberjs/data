---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl/types/IdOptions.md
---

# &#x20;IdOptions

```ts
interface IdOptions {
  sourceKey?: string;
}
```

Defined in: [fields/id.ts:10](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/id.ts#L10)

Options accepted by the [id](../functions/id.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/id.ts:18](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/id.ts#L18)

The name of the identity field as returned by the API, if it differs
from the decorated property's name. Compiles onto the
[IdentityField](../../core/types/schema/fields/types/IdentityField.md)'s `sourceKey`.
