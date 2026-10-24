---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/schema-dsl/types/DerivedOptions.md
description: >-
  Options for the `@derived` decorator that name the registered derivation that
  computes the field and the options passed to it.
---

# &#x20;DerivedOptions

```ts
interface DerivedOptions {
  options?: Record<string, unknown>;
  type: string;
}
```

Defined in: [fields/derived.ts:13](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/derived.ts#L13)

Options accepted by the [derived](../functions/derived.md) decorator.

## Properties

### options?

```ts
optional options?: Record<string, unknown>;
```

Defined in: [fields/derived.ts:29](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/derived.ts#L29)

Options to pass to the derivation. Must comply with the specific
derivation's options schema.

***

### type

```ts
type: string;
```

Defined in: [fields/derived.ts:21](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/derived.ts#L21)

The name of a [Derivation](../../core/types/schema/concepts/types/Derivation.md) registered with the schema service,
used to compute this field's value. Compiles onto the
[DerivedField](../../core/types/schema/fields/types/DerivedField.md)'s `type`.
