---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/schema-dsl/types/BelongsToOptions.md
---

# &#x20;BelongsToOptions

```ts
interface BelongsToOptions {
  as?: string;
  async?: boolean;
  inverse: string | null;
  polymorphic?: boolean;
  sourceKey?: string;
  type: string;
}
```

Defined in: [fields/belongs-to.ts:10](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L10)

Options accepted by the [belongsTo](../functions/belongsTo.md) decorator.

## Properties

### as?

```ts
optional as?: string;
```

Defined in: [fields/belongs-to.ts:49](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L49)

If this field is polymorphic, the trait or abstract type that this
resource implements.

***

### async?

```ts
optional async?: boolean;
```

Defined in: [fields/belongs-to.ts:32](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L32)

Whether the relationship is async. Compiles onto the
[LegacyBelongsToField](../../core/types/schema/fields/types/LegacyBelongsToField.md)'s `options.async`, defaulting to `false`.

***

### inverse

```ts
inverse: string | null;
```

Defined in: [fields/belongs-to.ts:24](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L24)

The name of the inverse field on the related resource, or `null` if
the relationship is unidirectional.

***

### polymorphic?

```ts
optional polymorphic?: boolean;
```

Defined in: [fields/belongs-to.ts:41](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L41)

Whether this field satisfies a polymorphic relationship on another
resource, meaning it can point to multiple types of resources so long
as they implement the trait or abstract type named by `type`.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/belongs-to.ts:57](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L57)

The name of the field as returned by the API, if it differs from the
decorated property's name.

***

### type

```ts
type: string;
```

Defined in: [fields/belongs-to.ts:16](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L16)

The name of the related resource's `type`.
