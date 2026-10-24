---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/graph/types/Operation.md
description: >-
  Base shape of every relationship Graph operation, carrying the operation's
  name in `op`.
---

# &#x20;Operation

```ts
interface Operation {
  op: string;
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:26](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/graph.ts#L26)

All Graph operations are objects with at least one property,
`op`, which contains a string with the name of the operation
to perform.

## Properties

### op

```ts
op: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:30](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/graph.ts#L30)

The name of the operation
