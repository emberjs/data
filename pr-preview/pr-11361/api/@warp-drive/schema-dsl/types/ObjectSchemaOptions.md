---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/schema-dsl/types/ObjectSchemaOptions.md
description: >-
  Options for the `ObjectSchema` class decorator; currently only a reserved
  `hash` flag that has no effect on the compiled object schema.
---

# &#x20;ObjectSchemaOptions

```ts
interface ObjectSchemaOptions {
  hash?: boolean;
}
```

Defined in: [entities/object-schema.ts:14](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/schema-dsl/src/entities/object-schema.ts#L14)

Options accepted by the [ObjectSchema](../functions/ObjectSchema.md) decorator.

## Properties

### hash?

```ts
optional hash?: boolean;
```

Defined in: [entities/object-schema.ts:22](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/schema-dsl/src/entities/object-schema.ts#L22)

Reserved for future use. The compiled schema's `identity` is currently
determined solely by whether a property on the class is decorated with
[hash](#hash), not by this option.
