---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/functions/instantiateRecord.md
---

# &#x20;instantiateRecord()

```ts
function instantiateRecord(
   store: Store, 
   identifier: ResourceKey, 
   createArgs?: Record<string, unknown>
): ReactiveResource;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/hooks.ts:21](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/hooks.ts#L21)

The store's default `instantiateRecord` hook implementation, which
produces a [ReactiveResource](../types/ReactiveResource.md) for `identifier` using the resource
schema registered for its type.

`createArgs` are only applied (via `Object.assign`) when the resource's
schema is `legacy`, matching the historical behavior of assigning initial
properties when creating a new legacy record.

## Parameters

### store

[`Store`](../../classes/Store.md)

### identifier

[`ResourceKey`](../../types/identifier/types/ResourceKey.md)

### createArgs?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

## Returns

[`ReactiveResource`](../types/ReactiveResource.md)
