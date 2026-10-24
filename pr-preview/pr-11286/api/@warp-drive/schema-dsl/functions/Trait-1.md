---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/schema-dsl/functions/Trait-1.md
---

# &#x20;Trait()

```ts
function Trait(target: AnyConstructor): void;
function Trait(name: string, options?: TraitOptions): (target: AnyConstructor) => void;
function Trait(options: TraitOptions): (target: AnyConstructor) => void;
```

## Call Signature

```ts
function Trait(target: AnyConstructor): void;
```

Defined in: [entities/trait.ts:71](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/entities/trait.ts#L71)

**`Class Decorator`**

Marks a class as a [trait](../../core/types/schema/fields/types/Trait.md) — a reusable
collection of fields that can be composed onto a [Resource](Resource.md) (or
another Trait) via [trait](trait.md).

The trait's `name` is derived from the class name (dasherized) unless a
`name` string is passed explicitly. Its `mode` defaults to `'polaris'`.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order. Unlike [Resource](Resource.md),
no `$type` or `constructor` [DerivedField](../../core/types/schema/fields/types/DerivedField.md) is ever added, since a
trait's fields are merged into whichever resource composes it.

### Parameters

#### target

`AnyConstructor`

### Returns

`void`

### Example

::: code-group

```ts [timestamped.ts]
import { Trait, field } from '@warp-drive/schema-dsl';

@Trait
export class Timestamped {
  @field({ type: 'date-time' }) declare createdAt: string;
  @field({ type: 'date-time' }) declare updatedAt: string;
}
```

```json [compiled schema]
{
  "name": "timestamped",
  "mode": "polaris",
  "fields": [
    { "kind": "field", "name": "createdAt", "type": "date-time" },
    { "kind": "field", "name": "updatedAt", "type": "date-time" }
  ]
}
```

:::

## Call Signature

```ts
function Trait(name: string, options?: TraitOptions): (target: AnyConstructor) => void;
```

Defined in: [entities/trait.ts:72](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/entities/trait.ts#L72)

**`Class Decorator`**

Marks a class as a [trait](../../core/types/schema/fields/types/Trait.md) — a reusable
collection of fields that can be composed onto a [Resource](Resource.md) (or
another Trait) via [trait](trait.md).

The trait's `name` is derived from the class name (dasherized) unless a
`name` string is passed explicitly. Its `mode` defaults to `'polaris'`.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order. Unlike [Resource](Resource.md),
no `$type` or `constructor` [DerivedField](../../core/types/schema/fields/types/DerivedField.md) is ever added, since a
trait's fields are merged into whichever resource composes it.

### Parameters

#### name

`string`

#### options?

[`TraitOptions`](../types/TraitOptions.md)

### Returns

(`target`: `AnyConstructor`) => `void`

### Example

::: code-group

```ts [timestamped.ts]
import { Trait, field } from '@warp-drive/schema-dsl';

@Trait
export class Timestamped {
  @field({ type: 'date-time' }) declare createdAt: string;
  @field({ type: 'date-time' }) declare updatedAt: string;
}
```

```json [compiled schema]
{
  "name": "timestamped",
  "mode": "polaris",
  "fields": [
    { "kind": "field", "name": "createdAt", "type": "date-time" },
    { "kind": "field", "name": "updatedAt", "type": "date-time" }
  ]
}
```

:::

## Call Signature

```ts
function Trait(options: TraitOptions): (target: AnyConstructor) => void;
```

Defined in: [entities/trait.ts:73](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/entities/trait.ts#L73)

**`Class Decorator`**

Marks a class as a [trait](../../core/types/schema/fields/types/Trait.md) — a reusable
collection of fields that can be composed onto a [Resource](Resource.md) (or
another Trait) via [trait](trait.md).

The trait's `name` is derived from the class name (dasherized) unless a
`name` string is passed explicitly. Its `mode` defaults to `'polaris'`.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order. Unlike [Resource](Resource.md),
no `$type` or `constructor` [DerivedField](../../core/types/schema/fields/types/DerivedField.md) is ever added, since a
trait's fields are merged into whichever resource composes it.

### Parameters

#### options

[`TraitOptions`](../types/TraitOptions.md)

### Returns

(`target`: `AnyConstructor`) => `void`

### Example

::: code-group

```ts [timestamped.ts]
import { Trait, field } from '@warp-drive/schema-dsl';

@Trait
export class Timestamped {
  @field({ type: 'date-time' }) declare createdAt: string;
  @field({ type: 'date-time' }) declare updatedAt: string;
}
```

```json [compiled schema]
{
  "name": "timestamped",
  "mode": "polaris",
  "fields": [
    { "kind": "field", "name": "createdAt", "type": "date-time" },
    { "kind": "field", "name": "updatedAt", "type": "date-time" }
  ]
}
```

:::
