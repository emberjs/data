---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/schema-dsl/types/ObjectSchemaOptions.md
---

# &#x20;ObjectSchemaOptions

```ts
interface ObjectSchemaOptions {
  hash?: boolean;
}
```

Defined in: [entities/object-schema.ts:12](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/schema-dsl/src/entities/object-schema.ts#L12)

Options accepted by the [ObjectSchema](../functions/ObjectSchema.md) decorator.

## Properties

### hash?

```ts
optional hash?: boolean;
```

Defined in: [entities/object-schema.ts:20](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/schema-dsl/src/entities/object-schema.ts#L20)

Reserved for future use. The compiled schema's `identity` is currently
determined solely by whether a property on the class is decorated with
[hash](#hash), not by this option.
