---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/experiments/storage/functions/CacheResource.md
description: >-
  Experimental class decorator that turns a class into a reactive resource whose
  fields persist via the Cache API and are shared across tabs.
---

&#x20;

# &#x20;CacheResource()

```ts
function CacheResource(id: string | KeyFn, namespace?: string | null): ClassDecorator;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage-resource.ts:79](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/storage-resource.ts#L79)

Decorator which transforms a class into a StorageResource
persisted via the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache).
api and shared across all tabs/windows under the same origin.

CacheResources must either be singletons or expect all instances
to share state unless a primary key function is provided.

When a primary key function is provided, each instance
will have its own persisted data based on the key generated
by the function.

The function will be called once per instance during
initialization to determine the unique ID for that instance.

All object cached in the same `namespace` share the namespace's storage context,
so partitioning can be achieved by using different namespaces for different groups
of data.

## Parameters

### id

`string` | [`KeyFn`](../types/KeyFn.md)

### namespace?

`string` | `null`

## Returns

`ClassDecorator`
