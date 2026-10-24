---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/identifier/types/NewResourceKey.md
---

# &#x20;NewResourceKey\<T *extends* `string` = `string`>

```ts
interface NewResourceKey<T extends string = string> extends ResourceKeyBase<T> {
  id: string | null;
  lid: string;
  type: T;
}
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:115](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/identifier.ts#L115)

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

Defined in: [warp-drive-packages/core/src/types/identifier.ts:122](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/identifier.ts#L122)

the PrimaryKey for the resource this ResourceKey represents. `null`
if not yet assigned a PrimaryKey value.

***

### lid

```ts
lid: string;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:68](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/identifier.ts#L68)

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

Defined in: [warp-drive-packages/core/src/types/identifier.ts:75](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/identifier.ts#L75)

the primary `ResourceType` or "model name" this ResourceKey belongs to.

#### Inherited from

```ts
ResourceKeyBase.type
```
