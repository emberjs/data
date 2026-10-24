---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/types/schema/fields/types/PolarisTrait.md
description: >-
  A named, reusable set of PolarisMode fields that resource schemas compose in
  via their `traits`, often to model polymorphic capabilities.
---

# &#x20;PolarisTrait

```ts
interface PolarisTrait {
  fields: PolarisModeFieldSchema[];
  mode: "polaris";
  name: string;
  traits?: string[];
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2538](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/schema/fields.ts#L2538)

A trait for use on a PolarisMode record.

Traits are reusable collections of fields that can be composed onto a
resource schema, often to describe a polymorphic capability shared by
multiple resource types.

## Properties

### fields

```ts
fields: PolarisModeFieldSchema[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2559](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/schema/fields.ts#L2559)

The fields that this trait contributes to any resource schema
that implements it.

***

### mode

```ts
mode: "polaris";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2553](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/schema/fields.ts#L2553)

The mode this trait is valid for use with.

A PolarisTrait may only be applied to PolarisMode resource schemas.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2546](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/schema/fields.ts#L2546)

The name of the trait.

This is the string referenced by a resource schema's `traits` array,
or by another trait's `traits` array, in order to make use of this
trait.

***

### traits?

```ts
optional traits?: string[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2567](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/schema/fields.ts#L2567)

A list of other traits that this trait itself implements.

As with a resource schema's `traits`, each entry should be a string
matching the `name` of another trait.
