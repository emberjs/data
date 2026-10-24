---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/types/graph/types/ReplaceRelatedRecordsOperation.md
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

Defined in: [warp-drive-packages/core/src/types/graph.ts:142](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/graph.ts#L142)

Replaces the state of a `to-many` relationship on the Graph with a
new set of values.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:154](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/graph.ts#L154)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:168](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/graph.ts#L168)

If this is a "splice", the index to start from

***

### op

```ts
op: "replaceRelatedRecords";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:146](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/graph.ts#L146)

The name of the operation

***

### prior?

```ts
optional prior?: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:164](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/graph.ts#L164)

If this is a "splice", the resources expected to be removed

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:150](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/graph.ts#L150)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:160](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/graph.ts#L160)

The resources to add. If neither [prior](#prior)
nor [index](#index) is specified, all
existing members should be removed.
