---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/schema-dsl/types/HasManyOptions.md
description: >-
  Options for the legacy `@hasMany` decorator that describe the related type,
  inverse, async and polymorphic behavior, and `sourceKey`.
---

# &#x20;HasManyOptions

```ts
interface HasManyOptions {
  as?: string;
  async?: boolean;
  inverse: string | null;
  polymorphic?: boolean;
  sourceKey?: string;
  type: string;
}
```

Defined in: [fields/has-many.ts:12](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L12)

Options accepted by the [hasMany](../functions/hasMany.md) decorator.

## Properties

### as?

```ts
optional as?: string;
```

Defined in: [fields/has-many.ts:51](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L51)

If this field is polymorphic, the trait or abstract type that this
resource implements.

***

### async?

```ts
optional async?: boolean;
```

Defined in: [fields/has-many.ts:34](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L34)

Whether the relationship is async. Compiles onto the
[LegacyHasManyField](../../core/types/schema/fields/types/LegacyHasManyField.md)'s `options.async`, defaulting to `false`.

***

### inverse

```ts
inverse: string | null;
```

Defined in: [fields/has-many.ts:26](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L26)

The name of the inverse field on the related resources, or `null` if
the relationship is unidirectional.

***

### polymorphic?

```ts
optional polymorphic?: boolean;
```

Defined in: [fields/has-many.ts:43](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L43)

Whether this field satisfies a polymorphic relationship on another
resource, meaning it can point to multiple types of resources so long
as they implement the trait or abstract type named by `type`.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/has-many.ts:59](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L59)

The name of the field as returned by the API, if it differs from the
decorated property's name.

***

### type

```ts
type: string;
```

Defined in: [fields/has-many.ts:18](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L18)

The name of the related resources' `type`.
