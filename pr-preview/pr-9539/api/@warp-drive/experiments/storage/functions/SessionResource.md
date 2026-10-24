---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/experiments/storage/functions/SessionResource.md
description: >-
  Experimental class decorator that turns a class into a reactive resource whose
  fields persist in sessionStorage.
---

&#x20;

# &#x20;SessionResource()

```ts
function SessionResource(id: string | KeyFn): ClassDecorator;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage-resource.ts:53](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/experiments/src/storage/storage-resource.ts#L53)

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
