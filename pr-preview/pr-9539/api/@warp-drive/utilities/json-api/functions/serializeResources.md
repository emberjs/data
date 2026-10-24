---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/utilities/json-api/functions/serializeResources.md
description: >-
  Copies the cached state of one or more resources into a JSON:API-style `{ data
  }` object, a starting point for request bodies.
---

# &#x20;serializeResources()

```ts
function serializeResources(cache: Cache, identifiers: ResourceKey): {
  data: ResourceObject;
};
function serializeResources(cache: Cache, identifiers: ResourceKey[]): {
  data: ResourceObject[];
};
```

## Call Signature

```ts
function serializeResources(cache: Cache, identifiers: ResourceKey): {
  data: ResourceObject;
};
```

Defined in: [-private/json-api/serialize.ts:49](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/-private/json-api/serialize.ts#L49)

:::warning ⚠️ **This util often won't produce the necessary body for a {json:api} request**

While this may come as a surprise, they are intended to serialize cache state for more
generalized usage. {json:api} has a large variance in acceptable shapes, and only your
app can ensure that the body is correctly formatted and contains all necessary data.
:::

Serializes the current state of a resource or array of resources for use with POST or PUT requests.

### Parameters

#### cache

`Cache`

the cache to serialize the resource(s) from

#### identifiers

[`ResourceKey`](../../../core/types/identifier/types/ResourceKey.md)

the resource(s) to serialize

### Returns

an object with a `data` property containing the serialized resource(s)

#### data

```ts
data: ResourceObject;
```

The serialized resource.

## Call Signature

```ts
function serializeResources(cache: Cache, identifiers: ResourceKey[]): {
  data: ResourceObject[];
};
```

Defined in: [-private/json-api/serialize.ts:58](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/-private/json-api/serialize.ts#L58)

:::warning ⚠️ **This util often won't produce the necessary body for a {json:api} request**

While this may come as a surprise, they are intended to serialize cache state for more
generalized usage. {json:api} has a large variance in acceptable shapes, and only your
app can ensure that the body is correctly formatted and contains all necessary data.
:::

Serializes the current state of a resource or array of resources for use with POST or PUT requests.

### Parameters

#### cache

`Cache`

the cache to serialize the resource(s) from

#### identifiers

[`ResourceKey`](../../../core/types/identifier/types/ResourceKey.md)\[]

the resource(s) to serialize

### Returns

an object with a `data` property containing the serialized resource(s)

#### data

```ts
data: ResourceObject[];
```

The serialized resources.
