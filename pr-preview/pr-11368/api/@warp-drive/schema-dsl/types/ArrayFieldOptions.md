---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/schema-dsl/types/ArrayFieldOptions.md
description: >-
  Options for the `@array` decorator that set the compiled array field's
  `sourceKey` and the transformation applied to each item.
---

# &#x20;ArrayFieldOptions

```ts
interface ArrayFieldOptions {
  sourceKey?: string;
  type?: string;
}
```

Defined in: [fields/array.ts:13](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/schema-dsl/src/fields/array.ts#L13)

Options accepted by the [array](../functions/array.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/array.ts:21](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/schema-dsl/src/fields/array.ts#L21)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the [ArrayField](../../core/types/schema/fields/types/ArrayField.md)'s
`sourceKey`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/array.ts:30](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/schema-dsl/src/fields/array.ts#L30)

The name of a [Transformation](../../core/types/schema/concepts/types/Transformation.md) to pass each item in the array
through before displaying or serializing it. Compiles onto the
[ArrayField](../../core/types/schema/fields/types/ArrayField.md)'s `type`.
