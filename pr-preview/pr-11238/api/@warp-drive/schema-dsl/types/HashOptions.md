---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/schema-dsl/types/HashOptions.md
description: >-
  Options for the `@hash` decorator that name the registered hash function used
  to compute an object schema's identity.
---

# &#x20;HashOptions

```ts
interface HashOptions {
  type: string;
}
```

Defined in: [fields/hash.ts:13](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/schema-dsl/src/fields/hash.ts#L13)

Options accepted by the [hash](../functions/hash.md) decorator.

## Properties

### type

```ts
type: string;
```

Defined in: [fields/hash.ts:20](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/schema-dsl/src/fields/hash.ts#L20)

The name of a [HashFn](../../core/types/schema/concepts/types/HashFn.md) registered with the schema service, used
to compute this field's value from the object's cache data.
