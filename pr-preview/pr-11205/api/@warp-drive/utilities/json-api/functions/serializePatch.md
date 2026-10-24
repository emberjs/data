---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/json-api/functions/serializePatch.md
---

# &#x20;serializePatch()

```ts
function serializePatch(cache: Cache, identifier: ResourceKey): {
  data: JsonApiResourcePatch;
};
```

Defined in: [-private/json-api/serialize.ts:157](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/-private/json-api/serialize.ts#L157)

:::warning ⚠️ **This util often won't produce the necessary body for a {json:api} request**

While this may come as a surprise, they are intended to serialize cache state for more
generalized usage. {json:api} has a large variance in acceptable shapes, and only your
app can ensure that the body is correctly formatted and contains all necessary data.
:::

Serializes changes to a resource. Useful for use with building bodies for PATCH requests.

Only attributes which are changed are serialized.
Only relationships which are changed are serialized.

Collection relationships serialize the collection as a whole.

If you would like to serialize updates to a collection more granularly
(for instance, as operations) request the diff from the store and
serialize as desired:

```ts
const relationshipDiffMap = cache.changedRelationships(identifier);
```

## Parameters

### cache

`Cache`

the cache to serialize the resource's changes from

### identifier

[`ResourceKey`](../../../core/types/identifier/types/ResourceKey.md)

the resource whose changes should be serialized

## Returns

an object with a `data` property containing the serialized resource patch

### data

```ts
data: JsonApiResourcePatch;
```

The serialized resource patch.
