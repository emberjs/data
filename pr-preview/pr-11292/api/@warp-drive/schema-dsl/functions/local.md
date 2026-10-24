---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/schema-dsl/functions/local.md
---

# &#x20;local()

```ts
function local(target: object, key: string): void;
function local(options: LocalOptions): (target: object, key: string) => void;
```

## Call Signature

```ts
function local(target: object, key: string): void;
```

Defined in: [fields/local.ts:54](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/local.ts#L54)

**`Decorator`**

Marks a property as a [LocalField](../../core/types/schema/fields/types/LocalField.md) — state that lives only on
the record instance, is never read from or written to the cache, and is
never sent to the server.

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
import { Resource, field, local } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare name: string;
  @local declare isEditing: boolean;
  @local({ defaultValue: 0 }) declare dirtyCount: number;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "@local", "name": "isEditing" },
  { "kind": "@local", "name": "dirtyCount", "options": { "defaultValue": 0 } }
]
```

:::

## Call Signature

```ts
function local(options: LocalOptions): (target: object, key: string) => void;
```

Defined in: [fields/local.ts:55](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/local.ts#L55)

**`Decorator`**

Marks a property as a [LocalField](../../core/types/schema/fields/types/LocalField.md) — state that lives only on
the record instance, is never read from or written to the cache, and is
never sent to the server.

### Parameters

#### options

[`LocalOptions`](../types/LocalOptions.md)

### Returns

(`target`: `object`, `key`: `string`) => `void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field, local } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare name: string;
  @local declare isEditing: boolean;
  @local({ defaultValue: 0 }) declare dirtyCount: number;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "@local", "name": "isEditing" },
  { "kind": "@local", "name": "dirtyCount", "options": { "defaultValue": 0 } }
]
```

:::
