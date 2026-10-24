---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/schema-dsl/types/HashOptions.md
---

# &#x20;HashOptions

```ts
interface HashOptions {
  type: string;
}
```

Defined in: [fields/hash.ts:11](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/hash.ts#L11)

Options accepted by the [hash](../functions/hash.md) decorator.

## Properties

### type

```ts
type: string;
```

Defined in: [fields/hash.ts:18](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/schema-dsl/src/fields/hash.ts#L18)

The name of a [HashFn](../../core/types/schema/concepts/types/HashFn.md) registered with the schema service, used
to compute this field's value from the object's cache data.
