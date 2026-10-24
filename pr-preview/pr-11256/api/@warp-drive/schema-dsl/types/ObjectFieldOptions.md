---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/schema-dsl/types/ObjectFieldOptions.md
description: >-
  Options for the `@object` decorator that set the compiled object field's
  `sourceKey` and the transformation applied to the whole object.
---

# &#x20;ObjectFieldOptions

```ts
interface ObjectFieldOptions {
  sourceKey?: string;
  type?: string;
}
```

Defined in: [fields/object.ts:13](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/object.ts#L13)

Options accepted by the [object](../functions/object.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/object.ts:21](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/object.ts#L21)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the [ObjectField](../../core/types/schema/fields/types/ObjectField.md)'s
`sourceKey`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/object.ts:30](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/object.ts#L30)

The name of a [Transformation](../../core/types/schema/concepts/types/Transformation.md) to pass the entire object through
before displaying or serializing it. Compiles onto the
[ObjectField](../../core/types/schema/fields/types/ObjectField.md)'s `type`.
