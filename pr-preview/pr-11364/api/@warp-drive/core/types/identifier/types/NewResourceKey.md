---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/types/identifier/types/NewResourceKey.md
description: >-
  Resource key for a record created locally with `store.createRecord`, whose
  `id` may still be `null`.
---

# &#x20;NewResourceKey\<T *extends* `string` = `string`>

```ts
interface NewResourceKey<T extends string = string> extends ResourceKeyBase<T> {
  id: string | null;
  lid: string;
  type: T;
}
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:138](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/identifier.ts#L138)

Used when a ResourceKey was created locally
(by a call to store.createRecord).

It is possible in rare circumstances to have a ResourceKey
that is not for a new record but does not have an ID. This would
happen if a user intentionally created one for use with a secondary-index
prior to the record having been fully loaded.

## Extends

* `ResourceKeyBase`<`T`>

## Type Parameters

### T

`T` *extends* `string` = `string`

## Properties

### id

```ts
id: string | null;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:145](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/identifier.ts#L145)

the PrimaryKey for the resource this ResourceKey represents. `null`
if not yet assigned a PrimaryKey value.

***

### lid

```ts
lid: string;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:84](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/identifier.ts#L84)

A string representing a unique identity.

#### Inherited from

```ts
ResourceKeyBase.lid
```

***

### type

```ts
type: T;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:91](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/identifier.ts#L91)

the primary `ResourceType` or "model name" this ResourceKey belongs to.

#### Inherited from

```ts
ResourceKeyBase.type
```
