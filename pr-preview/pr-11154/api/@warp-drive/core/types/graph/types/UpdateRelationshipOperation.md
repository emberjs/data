---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/graph/types/UpdateRelationshipOperation.md
---

# &#x20;UpdateRelationshipOperation

```ts
interface UpdateRelationshipOperation {
  field: string;
  op: "updateRelationship";
  record: ResourceKey;
  value: 
  | SingleResourceRelationship<
  | ExistingResourceIdentifierObject<string>
  | NewResourceIdentifierObject<string>>
  | CollectionResourceRelationship<
  | ExistingResourceIdentifierObject<string>
  | NewResourceIdentifierObject<string>>;
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:28](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L28)

Replaces the state of a relationship on the Graph with a new state.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:40](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L40)

The name of the relationship to update

***

### op

```ts
op: "updateRelationship";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:32](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L32)

The name of the operation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:36](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L36)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: 
  | SingleResourceRelationship<
  | ExistingResourceIdentifierObject<string>
  | NewResourceIdentifierObject<string>>
  | CollectionResourceRelationship<
  | ExistingResourceIdentifierObject<string>
| NewResourceIdentifierObject<string>>;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:44](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L44)

The new state for the relationship
