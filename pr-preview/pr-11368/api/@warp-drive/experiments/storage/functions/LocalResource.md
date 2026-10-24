---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/experiments/storage/functions/LocalResource.md
description: >-
  Experimental class decorator that turns a class into a reactive resource whose
  fields persist in localStorage.
---

&#x20;

# &#x20;LocalResource()

```ts
function LocalResource(id: string | KeyFn): ClassDecorator;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage-resource.ts:32](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/experiments/src/storage/storage-resource.ts#L32)

Decorator which transforms a class into a StorageResource
persisted in localStorage.

LocalResources must either be singletons or expect all instances
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
