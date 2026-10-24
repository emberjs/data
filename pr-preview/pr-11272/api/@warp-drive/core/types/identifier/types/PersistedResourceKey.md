---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/identifier/types/PersistedResourceKey.md
---

# &#x20;PersistedResourceKey\<T *extends* `string` = `string`>

```ts
interface PersistedResourceKey<T extends string = string> extends ResourceKeyBase<T> {
  id: string;
  lid: string;
  type: T;
}
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:94](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/identifier.ts#L94)

Used when a ResourceKey was not created locally as part
of a call to store.createRecord

Distinguishing between this ResourceKey and one for a client created
resource that was created with an ID is generally speaking not possible
at runtime, so anything with an ID typically narrows to this.

## Extends

* `ResourceKeyBase`<`T`>

## Type Parameters

### T

`T` *extends* `string` = `string`

## Properties

### id

```ts
id: string;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:100](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/identifier.ts#L100)

the PrimaryKey for the resource this ResourceKey represents.

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
