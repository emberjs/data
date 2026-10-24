---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/schema-dsl/types/AliasOptions.md
description: >-
  Options for the `@alias` decorator that identify the existing field (its kind,
  name, transformation type, and sourceKey) the alias points to.
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

Defined in: [fields/alias.ts:14](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/alias.ts#L14)

Options accepted by the [alias](../functions/alias.md) decorator, describing the field
being aliased.

## Properties

### kind

```ts
kind: string;
```

Defined in: [fields/alias.ts:21](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/alias.ts#L21)

The `kind` of the field being aliased, e.g. `'field'`, `'object'`, or
`'array'`.

***

### name

```ts
name: string;
```

Defined in: [fields/alias.ts:28](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/alias.ts#L28)

The `name` of the field being aliased.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/alias.ts:42](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/alias.ts#L42)

The `sourceKey` of the field being aliased, if it differs from `name`.

***

### type?

```ts
optional type?: string;
```

Defined in: [fields/alias.ts:35](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/alias.ts#L35)

The name of a [Transformation](../../core/types/schema/concepts/types/Transformation.md) associated with the aliased field.
