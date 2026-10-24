---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/core/types/identifier/types/PersistedResourceKey.md
description: >-
  Resource key whose `id` is a known string, the form keys for server-loaded
  resources take.
---

# &#x20;PersistedResourceKey\<T *extends* `string` = `string`>

```ts
interface PersistedResourceKey<T extends string = string> extends ResourceKeyBase<T> {
  id: string;
  lid: string;
  type: T;
}
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:112](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/identifier.ts#L112)

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

Defined in: [warp-drive-packages/core/src/types/identifier.ts:118](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/identifier.ts#L118)

the PrimaryKey for the resource this ResourceKey represents.

***

### lid

```ts
lid: string;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:84](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/identifier.ts#L84)

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

Defined in: [warp-drive-packages/core/src/types/identifier.ts:91](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/identifier.ts#L91)

the primary `ResourceType` or "model name" this ResourceKey belongs to.

#### Inherited from

```ts
ResourceKeyBase.type
```
