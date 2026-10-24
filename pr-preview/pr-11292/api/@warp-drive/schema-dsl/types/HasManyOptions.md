---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/schema-dsl/types/HasManyOptions.md
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

Defined in: [fields/has-many.ts:10](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L10)

Options accepted by the [hasMany](../functions/hasMany.md) decorator.

## Properties

### as?

```ts
optional as?: string;
```

Defined in: [fields/has-many.ts:49](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L49)

If this field is polymorphic, the trait or abstract type that this
resource implements.

***

### async?

```ts
optional async?: boolean;
```

Defined in: [fields/has-many.ts:32](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L32)

Whether the relationship is async. Compiles onto the
[LegacyHasManyField](../../core/types/schema/fields/types/LegacyHasManyField.md)'s `options.async`, defaulting to `false`.

***

### inverse

```ts
inverse: string | null;
```

Defined in: [fields/has-many.ts:24](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L24)

The name of the inverse field on the related resources, or `null` if
the relationship is unidirectional.

***

### polymorphic?

```ts
optional polymorphic?: boolean;
```

Defined in: [fields/has-many.ts:41](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L41)

Whether this field satisfies a polymorphic relationship on another
resource, meaning it can point to multiple types of resources so long
as they implement the trait or abstract type named by `type`.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [fields/has-many.ts:57](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L57)

The name of the field as returned by the API, if it differs from the
decorated property's name.

***

### type

```ts
type: string;
```

Defined in: [fields/has-many.ts:16](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L16)

The name of the related resources' `type`.
