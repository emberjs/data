---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl/types/FieldOptions.md
---

# &#x20;FieldOptions

```ts
interface FieldOptions {
  sourceKey?: string;
  type?: string;
}
```

Defined in: [fields/field.ts:11](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/field.ts#L11)

Options accepted by the [field](../functions/field.md) decorator.

## Properties

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/field.ts:25](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/field.ts#L25)

The name of the field as returned by the API, if it differs from the
decorated property's name. Compiles onto the field's `sourceKey`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/field.ts:17](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/field.ts#L17)

The name of a [Transformation](../../core/types/schema/concepts/types/Transformation.md) to compile onto the field's `type`.
