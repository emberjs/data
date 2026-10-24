---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/cache/operations/types/RemoveFromDocumentOperation.md
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

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:222](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L222)

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

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:231](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L231)

Which member of the document to remove from

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:239](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L239)

The index to remove the resource(s) from, if applicable

***

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:223](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L223)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: RequestKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:227](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L227)

The cache key for the request document

***

### value

```ts
value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:235](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/operations.ts#L235)

The resource(s) to remove
