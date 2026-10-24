---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/cache/operations/types/AddToDocumentOperation.md
description: >-
  Cache operation passed to `cache.patch` that adds resources to a request
  document's `data` or `included`, optionally at an index.
---

# &#x20;AddToDocumentOperation

```ts
interface AddToDocumentOperation extends Op {
  field: "data" | "included";
  index?: number;
  op: "add";
  record: RequestKey;
  value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:179](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/cache/operations.ts#L179)

Adds a resource to a request document, optionally
at a specific index. This can be used to update the
result of a request.

## Extends

* [`Op`](Op.md)

## Properties

### field

```ts
field: "data" | "included";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:188](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/cache/operations.ts#L188)

Which member of the document to add to

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:196](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/cache/operations.ts#L196)

The index at which to insert the resource(s), if applicable

***

### op

```ts
op: "add";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:180](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/cache/operations.ts#L180)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: RequestKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:184](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/cache/operations.ts#L184)

The cache key for the request document

***

### value

```ts
value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:192](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/cache/operations.ts#L192)

The resource(s) to add
