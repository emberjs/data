---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/schema-dsl/types/TraitOptions.md
---

# &#x20;TraitOptions

```ts
interface TraitOptions {
  mode?: "legacy" | "polaris";
}
```

Defined in: [entities/trait.ts:17](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/entities/trait.ts#L17)

Options accepted by the [Trait](../functions/Trait-1.md) decorator.

## Properties

### mode?

```ts
optional mode?: "legacy" | "polaris";
```

Defined in: [entities/trait.ts:24](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/entities/trait.ts#L24)

The mode this trait is valid for use with: `'polaris'` compiles a
[PolarisTrait](../../core/types/schema/fields/types/PolarisTrait.md), `'legacy'` compiles a [LegacyTrait](../../core/types/schema/fields/types/LegacyTrait.md).
