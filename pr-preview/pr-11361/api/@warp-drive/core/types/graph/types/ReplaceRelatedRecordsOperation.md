---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/types/graph/types/ReplaceRelatedRecordsOperation.md
description: >-
  Graph operation that replaces or splices the members of a to-many
  relationship.
---

# &#x20;ReplaceRelatedRecordsOperation

```ts
interface ReplaceRelatedRecordsOperation {
  field: string;
  index?: number;
  op: "replaceRelatedRecords";
  prior?: ResourceKey[];
  record: ResourceKey;
  value: ResourceKey[];
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:164](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/graph.ts#L164)

Replaces the state of a `to-many` relationship on the Graph with a
new set of values.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:176](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/graph.ts#L176)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:190](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/graph.ts#L190)

If this is a "splice", the index to start from

***

### op

```ts
op: "replaceRelatedRecords";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:168](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/graph.ts#L168)

The name of the operation

***

### prior?

```ts
optional prior?: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:186](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/graph.ts#L186)

If this is a "splice", the resources expected to be removed

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:172](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/graph.ts#L172)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:182](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/graph.ts#L182)

The resources to add. If neither [prior](#prior)
nor [index](#index) is specified, all
existing members should be removed.
