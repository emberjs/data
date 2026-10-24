---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/schema-dsl/types/TraitOptions.md
description: >-
  Options for the `Trait` class decorator that select whether it compiles to a
  polaris-mode or a legacy-mode trait.
---

# &#x20;TraitOptions

```ts
interface TraitOptions {
  mode?: "legacy" | "polaris";
}
```

Defined in: [entities/trait.ts:19](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/entities/trait.ts#L19)

Options accepted by the [Trait](../functions/Trait-1.md) decorator.

## Properties

### mode?

```ts
optional mode?: "legacy" | "polaris";
```

Defined in: [entities/trait.ts:26](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/entities/trait.ts#L26)

The mode this trait is valid for use with: `'polaris'` compiles a
[PolarisTrait](../../core/types/schema/fields/types/PolarisTrait.md), `'legacy'` compiles a [LegacyTrait](../../core/types/schema/fields/types/LegacyTrait.md).
