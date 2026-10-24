---
url: /pr-preview/pr-11154/api/@warp-drive/schema-dsl/functions/Resource.md
---

# &#x20;Resource()

```ts
function Resource(target: AnyConstructor): void;
function Resource(type: string, options?: ResourceOptions): (target: AnyConstructor) => void;
function Resource(options: ResourceOptions): (target: AnyConstructor) => void;
```

## Call Signature

```ts
function Resource(target: AnyConstructor): void;
```

Defined in: [entities/resource.ts:120](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/schema-dsl/src/entities/resource.ts#L120)

**`Class Decorator`**

Marks a class as a resource schema — a primary resource with its own
unique [identity](../../core/types/schema/fields/types/IdentityField.md) — compiling it to a
[PolarisResourceSchema](../../core/types/schema/fields/types/PolarisResourceSchema.md), or a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) when
[ResourceOptions.legacy](../types/ResourceOptions.md#legacy) is set.

The resource's `type` is derived from the class name (dasherized, e.g.
`UserProfile` compiles to `'user-profile'`) unless a `type` string is
passed explicitly. Its identity defaults to `{ kind: '@id', name: 'id' }`
unless a property is decorated with [id](id.md), or
[ResourceOptions.identityField](../types/ResourceOptions.md#identityfield) names a different property.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order. Unless
[ResourceOptions.legacy](../types/ResourceOptions.md#legacy) is set, a `$type` and a `constructor`
[DerivedField](../../core/types/schema/fields/types/DerivedField.md) are appended automatically: the first before any
declared fields, the second after.

### Parameters

#### target

`AnyConstructor`

### Returns

`void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare firstName: string;
  @field declare lastName: string;
}
```

```json [compiled schema]
{
  "type": "user",
  "identity": { "kind": "@id", "name": "id" },
  "fields": [
    { "kind": "derived", "name": "$type", "type": "@identity", "options": { "key": "type" } },
    { "kind": "field", "name": "firstName" },
    { "kind": "field", "name": "lastName" },
    { "kind": "derived", "name": "constructor", "type": "@constructor" }
  ]
}
```

:::

Passing a `type` overrides the derived name, and `{ legacy: true }`
compiles to a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) instead:

::: code-group

```ts [post.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource('blog-post', { legacy: true })
export class Post {
  @field declare title: string;
}
```

```json [compiled schema]
{
  "type": "blog-post",
  "identity": { "kind": "@id", "name": "id" },
  "fields": [
    { "kind": "field", "name": "title" }
  ],
  "legacy": true
}
```

:::

## Call Signature

```ts
function Resource(type: string, options?: ResourceOptions): (target: AnyConstructor) => void;
```

Defined in: [entities/resource.ts:121](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/schema-dsl/src/entities/resource.ts#L121)

**`Class Decorator`**

Marks a class as a resource schema — a primary resource with its own
unique [identity](../../core/types/schema/fields/types/IdentityField.md) — compiling it to a
[PolarisResourceSchema](../../core/types/schema/fields/types/PolarisResourceSchema.md), or a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) when
[ResourceOptions.legacy](../types/ResourceOptions.md#legacy) is set.

The resource's `type` is derived from the class name (dasherized, e.g.
`UserProfile` compiles to `'user-profile'`) unless a `type` string is
passed explicitly. Its identity defaults to `{ kind: '@id', name: 'id' }`
unless a property is decorated with [id](id.md), or
[ResourceOptions.identityField](../types/ResourceOptions.md#identityfield) names a different property.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order. Unless
[ResourceOptions.legacy](../types/ResourceOptions.md#legacy) is set, a `$type` and a `constructor`
[DerivedField](../../core/types/schema/fields/types/DerivedField.md) are appended automatically: the first before any
declared fields, the second after.

### Parameters

#### type

`string`

#### options?

[`ResourceOptions`](../types/ResourceOptions.md)

### Returns

(`target`: `AnyConstructor`) => `void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare firstName: string;
  @field declare lastName: string;
}
```

```json [compiled schema]
{
  "type": "user",
  "identity": { "kind": "@id", "name": "id" },
  "fields": [
    { "kind": "derived", "name": "$type", "type": "@identity", "options": { "key": "type" } },
    { "kind": "field", "name": "firstName" },
    { "kind": "field", "name": "lastName" },
    { "kind": "derived", "name": "constructor", "type": "@constructor" }
  ]
}
```

:::

Passing a `type` overrides the derived name, and `{ legacy: true }`
compiles to a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) instead:

::: code-group

```ts [post.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource('blog-post', { legacy: true })
export class Post {
  @field declare title: string;
}
```

```json [compiled schema]
{
  "type": "blog-post",
  "identity": { "kind": "@id", "name": "id" },
  "fields": [
    { "kind": "field", "name": "title" }
  ],
  "legacy": true
}
```

:::

## Call Signature

```ts
function Resource(options: ResourceOptions): (target: AnyConstructor) => void;
```

Defined in: [entities/resource.ts:122](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/schema-dsl/src/entities/resource.ts#L122)

**`Class Decorator`**

Marks a class as a resource schema — a primary resource with its own
unique [identity](../../core/types/schema/fields/types/IdentityField.md) — compiling it to a
[PolarisResourceSchema](../../core/types/schema/fields/types/PolarisResourceSchema.md), or a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) when
[ResourceOptions.legacy](../types/ResourceOptions.md#legacy) is set.

The resource's `type` is derived from the class name (dasherized, e.g.
`UserProfile` compiles to `'user-profile'`) unless a `type` string is
passed explicitly. Its identity defaults to `{ kind: '@id', name: 'id' }`
unless a property is decorated with [id](id.md), or
[ResourceOptions.identityField](../types/ResourceOptions.md#identityfield) names a different property.

Each decorated property on the class contributes one entry to the
compiled `fields` array, in declaration order. Unless
[ResourceOptions.legacy](../types/ResourceOptions.md#legacy) is set, a `$type` and a `constructor`
[DerivedField](../../core/types/schema/fields/types/DerivedField.md) are appended automatically: the first before any
declared fields, the second after.

### Parameters

#### options

[`ResourceOptions`](../types/ResourceOptions.md)

### Returns

(`target`: `AnyConstructor`) => `void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare firstName: string;
  @field declare lastName: string;
}
```

```json [compiled schema]
{
  "type": "user",
  "identity": { "kind": "@id", "name": "id" },
  "fields": [
    { "kind": "derived", "name": "$type", "type": "@identity", "options": { "key": "type" } },
    { "kind": "field", "name": "firstName" },
    { "kind": "field", "name": "lastName" },
    { "kind": "derived", "name": "constructor", "type": "@constructor" }
  ]
}
```

:::

Passing a `type` overrides the derived name, and `{ legacy: true }`
compiles to a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) instead:

::: code-group

```ts [post.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource('blog-post', { legacy: true })
export class Post {
  @field declare title: string;
}
```

```json [compiled schema]
{
  "type": "blog-post",
  "identity": { "kind": "@id", "name": "id" },
  "fields": [
    { "kind": "field", "name": "title" }
  ],
  "legacy": true
}
```

:::
