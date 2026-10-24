---
url: /pr-preview/pr-11154/api/@warp-drive/core/types/identifier/types/RequestKey.md
---

# &#x20;RequestKey

```ts
interface RequestKey {
  lid: string;
  type: "@document";
}
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:43](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/identifier.ts#L43)

A referentially stable object with a unique string (lid) that can be used
as a reference to request data in the cache.

Only requests that are assigned a RequestKey are retrievable/replayable from
the cache, though requests without RequestKeys may still update cache state.

## Properties

### lid

```ts
lid: string;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:47](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/identifier.ts#L47)

A string representing a unique identity.

***

### type

```ts
type: "@document";
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:51](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/identifier.ts#L51)

Discriminates a RequestKey from a [ResourceKey](ResourceKey.md).
