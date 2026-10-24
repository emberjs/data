---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/schema-dsl/functions/local.md
description: >-
  Property decorator that compiles to a local field, instance-only state that is
  never read from or written to the cache or sent to the server.
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

Defined in: [fields/local.ts:57](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/schema-dsl/src/fields/local.ts#L57)

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

Defined in: [fields/local.ts:58](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/schema-dsl/src/fields/local.ts#L58)

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
