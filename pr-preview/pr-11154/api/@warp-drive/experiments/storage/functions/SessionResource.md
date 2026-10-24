---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/experiments/storage/functions/SessionResource.md
---

&#x20;

# &#x20;SessionResource()

```ts
function SessionResource(id: string | KeyFn): ClassDecorator;
```

Defined in: [storage/storage-resource.ts:47](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/storage/storage-resource.ts#L47)

Decorator which transforms a class into a StorageResource
persisted in sessionStorage.

SessionResources must either be singletons or expect all instances
to share state unless a primary key function is provided.

When a primary key function is provided, each instance
will have its own persisted data based on the key generated
by the function.

The function will be called once per instance during
initialization to determine the unique ID for that instance.

## Parameters

### id

`string` | [`KeyFn`](../types/KeyFn.md)

## Returns

`ClassDecorator`
