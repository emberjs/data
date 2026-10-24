---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/experiments/storage/functions/LocalResource.md
---

&#x20;

# &#x20;LocalResource()

```ts
function LocalResource(id: string | KeyFn): ClassDecorator;
```

Defined in: [storage/storage-resource.ts:29](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/storage/storage-resource.ts#L29)

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
