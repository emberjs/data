---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/cache/operations/types/RemoveDocumentOperation.md
---

# &#x20;RemoveDocumentOperation

```ts
interface RemoveDocumentOperation extends Op {
  op: "remove";
  record: RequestKey;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:63](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L63)

Removes a document and its associated request from
the cache.

## Extends

* [`Op`](Op.md)

## Properties

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:64](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L64)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: RequestKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:68](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L68)

The cache key for the request
