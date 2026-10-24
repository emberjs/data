---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/core/types/cache/operations/types/RemoveFromDocumentOperation.md
description: >-
  Cache operation passed to `cache.patch` that removes resources from a request
  document's `data` or `included`.
---

# &#x20;RemoveFromDocumentOperation

```ts
interface RemoveFromDocumentOperation extends Op {
  field: "data" | "included";
  index?: number;
  op: "remove";
  record: RequestKey;
  value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:255](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/cache/operations.ts#L255)

Removes a resource from a request document, optionally
at a specific index. This can be used to update the
result of a request.

## Extends

* [`Op`](Op.md)

## Properties

### field

```ts
field: "data" | "included";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:264](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/cache/operations.ts#L264)

Which member of the document to remove from

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:272](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/cache/operations.ts#L272)

The index to remove the resource(s) from, if applicable

***

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:256](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/cache/operations.ts#L256)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: RequestKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:260](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/cache/operations.ts#L260)

The cache key for the request document

***

### value

```ts
value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:268](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/cache/operations.ts#L268)

The resource(s) to remove
