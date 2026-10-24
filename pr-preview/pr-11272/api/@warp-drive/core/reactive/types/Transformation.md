---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/reactive/types/Transformation.md
---

# &#x20;Transformation\<T *extends* [`Value`](../../types/json/raw/types/Value.md) = [`Value`](../../types/json/raw/types/Value.md), PT = `unknown`>

```ts
type Transformation<T extends Value = Value, PT = unknown> = {
  ___(unique) Symbol($type): string;
  defaultValue?: T;
  hydrate: PT;
  serialize: T;
};
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:649](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/schema.ts#L649)

Defines how to convert a `GenericField`, `ObjectField`, or `ArrayField`
between the raw value `T` stored in the cache and the presentation value
`PT` exposed on the record.

## Type Parameters

### T

`T` *extends* [`Value`](../../types/json/raw/types/Value.md) = [`Value`](../../types/json/raw/types/Value.md)

### PT

`PT` = `unknown`

## Methods

### defaultValue()?

```ts
optional defaultValue(options: 
  | Record<string, unknown>
  | null, identifier: ResourceKey): T;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:655](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/schema.ts#L655)

Computes the value to use when the cache has no value for the field.

#### Parameters

##### options

| [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>
| `null`

##### identifier

[`ResourceKey`](../../types/identifier/types/ResourceKey.md)

#### Returns

`T`

***

### hydrate()

```ts
hydrate(
   value: T | undefined, 
   options: 
  | Record<string, unknown>
  | null, 
   record: ReactiveResource
): PT;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:653](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/schema.ts#L653)

Converts the raw cache value into its presentation value.

#### Parameters

##### value

`T` | `undefined`

##### options

| [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>
| `null`

##### record

[`ReactiveResource`](ReactiveResource.md)

#### Returns

`PT`

***

### serialize()

```ts
serialize(
   value: PT, 
   options: 
  | Record<string, unknown>
  | null, 
   record: ReactiveResource
): T;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:651](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/schema.ts#L651)

Converts the presentation value into the raw value to store in the cache.

#### Parameters

##### value

`PT`

##### options

| [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>
| `null`

##### record

[`ReactiveResource`](ReactiveResource.md)

#### Returns

`T`

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): string;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:657](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/schema.ts#L657)

The name under which this transformation is registered and looked up.
