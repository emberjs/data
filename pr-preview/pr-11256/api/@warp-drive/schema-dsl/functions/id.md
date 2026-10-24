---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/schema-dsl/functions/id.md
description: >-
  Property decorator that makes the decorated property a resource's identity
  field, needed only when the primary key is not named `id`.
---

# &#x20;id()

```ts
function id(target: object, key: string): void;
function id(options: IdOptions): (target: object, key: string) => void;
```

## Call Signature

```ts
function id(target: object, key: string): void;
```

Defined in: [fields/id.ts:58](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/id.ts#L58)

**`Decorator`**

Marks a property as the [identity field](../../core/types/schema/fields/types/IdentityField.md) for a
[Resource](Resource.md), overriding the default `{ kind: '@id', name: 'id' }`
identity with `{ kind: '@id', name: <decorated property> }`.

Only needed when a resource's primary key is not named `id`; most
resources can rely on [Resource](Resource.md)'s default identity instead.

### Parameters

#### target

`object`

#### key

`string`

### Returns

`void`

### Example

::: code-group

```ts [post.ts]
import { Resource, id, field } from '@warp-drive/schema-dsl';

@Resource
export class Post {
  @id declare uuid: string;
  @field declare title: string;
}
```

```json [compiled schema (excerpt)]
{
  "type": "post",
  "identity": { "kind": "@id", "name": "uuid" }
}
```

:::

## Call Signature

```ts
function id(options: IdOptions): (target: object, key: string) => void;
```

Defined in: [fields/id.ts:59](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/id.ts#L59)

**`Decorator`**

Marks a property as the [identity field](../../core/types/schema/fields/types/IdentityField.md) for a
[Resource](Resource.md), overriding the default `{ kind: '@id', name: 'id' }`
identity with `{ kind: '@id', name: <decorated property> }`.

Only needed when a resource's primary key is not named `id`; most
resources can rely on [Resource](Resource.md)'s default identity instead.

### Parameters

#### options

[`IdOptions`](../types/IdOptions.md)

### Returns

(`target`: `object`, `key`: `string`) => `void`

### Example

::: code-group

```ts [post.ts]
import { Resource, id, field } from '@warp-drive/schema-dsl';

@Resource
export class Post {
  @id declare uuid: string;
  @field declare title: string;
}
```

```json [compiled schema (excerpt)]
{
  "type": "post",
  "identity": { "kind": "@id", "name": "uuid" }
}
```

:::
