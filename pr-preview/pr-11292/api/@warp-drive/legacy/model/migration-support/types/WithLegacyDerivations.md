---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/model/migration-support/types/WithLegacyDerivations.md
---

&#x20;

# &#x20;WithLegacyDerivations\<T *extends* [`TypedRecordInstance`](../../../../core/types/record/types/TypedRecordInstance.md)>

```ts
type WithLegacyDerivations<T extends TypedRecordInstance> = T & MinimalLegacyRecord & {
  belongsTo: typeof belongsTo;
  hasMany: typeof hasMany;
};
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:87](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/migration-support.ts#L87)

Adds the `Model`-style `belongsTo`/`hasMany` reference methods to a
[TypedRecordInstance](../../../../core/types/record/types/TypedRecordInstance.md), for use when migrating a resource from
`Model` to a schema-based record while preserving these APIs.

## Type Declaration

### belongsTo

```ts
belongsTo: typeof belongsTo;
```

see belongsTo

### hasMany

```ts
hasMany: typeof hasMany;
```

see hasMany

## Type Parameters

### T

`T` *extends* [`TypedRecordInstance`](../../../../core/types/record/types/TypedRecordInstance.md)
