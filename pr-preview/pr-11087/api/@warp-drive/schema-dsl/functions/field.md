---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl/functions/field.md
---

# &#x20;field()

```ts
function field(target: object, key: string): void;
function field(options: FieldOptions): (target: object, key: string) => void;
```

## Call Signature

```ts
function field(target: object, key: string): void;
```

Defined in: [fields/field.ts:59](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/field.ts#L59)

**`Decorator`**

Marks a property as a [GenericField](../../core/types/schema/fields/types/GenericField.md) — a plain field for
primitive values (strings, numbers, booleans) — on a
[Resource](Resource.md), [ObjectSchema](ObjectSchema.md), or [Trait](Trait-1.md).

### Parameters

#### target

`object`

#### key

`string`

### Returns

`void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare firstName: string;
  @field({ type: 'date-time', sourceKey: 'created_at' }) declare createdAt: string;
}
```

```json [compiled fields]
[
  { "kind": "field", "name": "firstName" },
  { "kind": "field", "name": "createdAt", "type": "date-time", "sourceKey": "created_at" }
]
```

:::

## Call Signature

```ts
function field(options: FieldOptions): (target: object, key: string) => void;
```

Defined in: [fields/field.ts:60](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/field.ts#L60)

**`Decorator`**

Marks a property as a [GenericField](../../core/types/schema/fields/types/GenericField.md) — a plain field for
primitive values (strings, numbers, booleans) — on a
[Resource](Resource.md), [ObjectSchema](ObjectSchema.md), or [Trait](Trait-1.md).

### Parameters

#### options

[`FieldOptions`](../types/FieldOptions.md)

### Returns

(`target`: `object`, `key`: `string`) => `void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare firstName: string;
  @field({ type: 'date-time', sourceKey: 'created_at' }) declare createdAt: string;
}
```

```json [compiled fields]
[
  { "kind": "field", "name": "firstName" },
  { "kind": "field", "name": "createdAt", "type": "date-time", "sourceKey": "created_at" }
]
```

:::
