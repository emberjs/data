---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/graph/types/UnknownOperation.md
description: >-
  Placeholder Graph operation, with `op: 'never'`, for a relationship whose
  to-one or to-many kind is not yet known.
---

# &#x20;UnknownOperation

```ts
interface UnknownOperation {
  field: string;
  op: "never";
  record: ResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:86](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/graph.ts#L86)

A placeholder operation for a relationship whose kind (`to-one` vs
`to-many`) is not yet known to the Graph.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:98](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/graph.ts#L98)

The name of the relationship

***

### op

```ts
op: "never";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:90](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/graph.ts#L90)

The name of the operation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:94](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/graph.ts#L94)

The cache key for the resource whose relationship is affected
