---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/schema-dsl/types/LocalOptions.md
---

# &#x20;LocalOptions

```ts
interface LocalOptions {
  defaultValue?: PrimitiveValue;
}
```

Defined in: [fields/local.ts:12](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/local.ts#L12)

Options accepted by the [local](../functions/local.md) decorator.

## Properties

### defaultValue?

```ts
optional defaultValue?: PrimitiveValue;
```

Defined in: [fields/local.ts:19](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/local.ts#L19)

The value to use for the field until it is first set. Compiles onto
the [LocalField](../../core/types/schema/fields/types/LocalField.md)'s `options.defaultValue`.
