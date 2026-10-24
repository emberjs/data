---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/schema-dsl/types/BelongsToOptions.md
description: >-
  Options for the legacy `@belongsTo` decorator that describe the related type,
  inverse, async and polymorphic behavior, and `sourceKey`.
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

Defined in: [fields/belongs-to.ts:12](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L12)

Options accepted by the [belongsTo](../functions/belongsTo.md) decorator.

## Properties

### as?

```ts
optional as?: string;
```

Defined in: [fields/belongs-to.ts:51](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L51)

If this field is polymorphic, the trait or abstract type that this
resource implements.

***

### async?

```ts
optional async?: boolean;
```

Defined in: [fields/belongs-to.ts:34](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L34)

Whether the relationship is async. Compiles onto the
[LegacyBelongsToField](../../core/types/schema/fields/types/LegacyBelongsToField.md)'s `options.async`, defaulting to `false`.

***

### inverse

```ts
inverse: string | null;
```

Defined in: [fields/belongs-to.ts:26](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L26)

The name of the inverse field on the related resource, or `null` if
the relationship is unidirectional.

***

### polymorphic?

```ts
optional polymorphic?: boolean;
```

Defined in: [fields/belongs-to.ts:43](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L43)

Whether this field satisfies a polymorphic relationship on another
resource, meaning it can point to multiple types of resources so long
as they implement the trait or abstract type named by `type`.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/belongs-to.ts:59](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L59)

The name of the field as returned by the API, if it differs from the
decorated property's name.

***

### type

```ts
type: string;
```

Defined in: [fields/belongs-to.ts:18](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L18)

The name of the related resource's `type`.
