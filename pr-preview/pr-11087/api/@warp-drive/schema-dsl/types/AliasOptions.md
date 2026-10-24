---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl/types/AliasOptions.md
---

# &#x20;AliasOptions

```ts
interface AliasOptions {
  kind: string;
  name: string;
  sourceKey?: string;
  type?: string;
}
```

Defined in: [fields/alias.ts:12](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/alias.ts#L12)

Options accepted by the [alias](../functions/alias.md) decorator, describing the field
being aliased.

## Properties

### kind

```ts
kind: string;
```

Defined in: [fields/alias.ts:19](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/alias.ts#L19)

The `kind` of the field being aliased, e.g. `'field'`, `'object'`, or
`'array'`.

***

### name

```ts
name: string;
```

Defined in: [fields/alias.ts:26](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/alias.ts#L26)

The `name` of the field being aliased.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/alias.ts:40](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/alias.ts#L40)

The `sourceKey` of the field being aliased, if it differs from `name`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/alias.ts:33](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/alias.ts#L33)

The name of a [Transformation](../../core/types/schema/concepts/types/Transformation.md) associated with the aliased field.
