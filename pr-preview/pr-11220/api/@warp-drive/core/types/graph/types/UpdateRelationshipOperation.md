---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/graph/types/UpdateRelationshipOperation.md
description: >-
  Graph operation that replaces a relationship's remote state with a raw
  JSON:API relationship object.
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

Defined in: [warp-drive-packages/core/src/types/graph.ts:38](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/graph.ts#L38)

Replaces the state of a relationship on the Graph with a new state.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:50](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/graph.ts#L50)

The name of the relationship to update

***

### op

```ts
op: "updateRelationship";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:42](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/graph.ts#L42)

The name of the operation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:46](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/graph.ts#L46)

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

Defined in: [warp-drive-packages/core/src/types/graph.ts:54](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/graph.ts#L54)

The new state for the relationship
