---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/types/cache/operations/types/RemoveResourceOperation.md
---

# &#x20;RemoveResourceOperation

```ts
interface RemoveResourceOperation extends Op {
  op: "remove";
  record: PersistedResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:76](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/cache/operations.ts#L76)

Removes a resource from the cache. This is treated
as if a remote deletion has occurred, and all references
to the resource should be eliminated.

## Extends

* [`Op`](Op.md)

## Properties

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:77](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/cache/operations.ts#L77)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:81](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/cache/operations.ts#L81)

The cache key for the resource
