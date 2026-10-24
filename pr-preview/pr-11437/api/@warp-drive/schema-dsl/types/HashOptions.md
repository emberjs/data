---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/schema-dsl/types/HashOptions.md
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

Defined in: [fields/hash.ts:13](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/schema-dsl/src/fields/hash.ts#L13)

Options accepted by the [hash](../functions/hash.md) decorator.

## Properties

### type

```ts
type: string;
```

Defined in: [fields/hash.ts:20](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/schema-dsl/src/fields/hash.ts#L20)

The name of a [HashFn](../../core/types/schema/concepts/types/HashFn.md) registered with the schema service, used
to compute this field's value from the object's cache data.
