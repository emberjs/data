---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/schema-dsl/types/FieldOptions.md
description: >-
  Options for the `@field` decorator that set the compiled field's
  transformation `type` and `sourceKey`.
---

# &#x20;FieldOptions

```ts
interface FieldOptions {
  sourceKey?: string;
  type?: string;
}
```

Defined in: [fields/field.ts:12](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/fields/field.ts#L12)

Options accepted by the [field](../functions/field.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/field.ts:26](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/fields/field.ts#L26)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the field's `sourceKey`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/field.ts:18](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/schema-dsl/src/fields/field.ts#L18)

The name of a [Transformation](../../core/types/schema/concepts/types/Transformation.md) to compile onto the field's `type`.
