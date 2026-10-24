---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/experiments/storage/functions/CacheResource.md
---

&#x20;

# &#x20;CacheResource()

```ts
function CacheResource(id: string | KeyFn, namespace?: string | null): ClassDecorator;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage-resource.ts:70](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/experiments/src/storage/storage-resource.ts#L70)

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
