---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/core/types/schema/fields/types/PolarisTrait.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2582](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/schema/fields.ts#L2582)

A trait for use on a PolarisMode record.

Traits are reusable collections of fields that can be composed onto a
resource schema, often to describe a polymorphic capability shared by
multiple resource types.

## Properties

### fields

```ts
fields: PolarisModeFieldSchema[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2603](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/schema/fields.ts#L2603)

The fields that this trait contributes to any resource schema
that implements it.

***

### mode

```ts
mode: "polaris";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2597](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/schema/fields.ts#L2597)

The mode this trait is valid for use with.

A PolarisTrait may only be applied to PolarisMode resource schemas.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2590](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/schema/fields.ts#L2590)

The name of the trait.

This is the string referenced by a resource schema's `traits` array,
or by another trait's `traits` array, in order to make use of this
trait.

***

### traits?

```ts
optional traits?: string[];
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2611](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/schema/fields.ts#L2611)

A list of other traits that this trait itself implements.

As with a resource schema's `traits`, each entry should be a string
matching the `name` of another trait.
