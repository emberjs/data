---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/cache/types/RelationshipDiff.md
---

# &#x20;RelationshipDiff

```ts
type RelationshipDiff = 
  | {
  additions: Set<ResourceKey>;
  kind: "collection";
  localState: ResourceKey[];
  remoteState: ResourceKey[];
  removals: Set<ResourceKey>;
  reordered: boolean;
}
  | {
  kind: "resource";
  localState: ResourceKey | null;
  remoteState: ResourceKey | null;
};
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:36](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache.ts#L36)

Describes the local (uncommitted) changes to a single relationship,
as returned by [Cache.changedRelationships](Cache.md#changedrelationships).

## Union Members

### Type Literal

```ts
{
  additions: Set<ResourceKey>;
  kind: "collection";
  localState: ResourceKey[];
  remoteState: ResourceKey[];
  removals: Set<ResourceKey>;
  reordered: boolean;
}
```

#### additions

```ts
additions: Set<ResourceKey>;
```

members present in localState but not in remoteState

#### kind

```ts
kind: "collection";
```

indicates this diff describes a `to-many` relationship

#### localState

```ts
localState: ResourceKey[];
```

the relationship's members including any local (uncommitted) changes

#### remoteState

```ts
remoteState: ResourceKey[];
```

the relationship's members as last known from the API

#### removals

```ts
removals: Set<ResourceKey>;
```

members present in remoteState but not in localState

#### reordered

```ts
reordered: boolean;
```

whether the order of members in localState differs from remoteState

***

### Type Literal

```ts
{
  kind: "resource";
  localState: ResourceKey | null;
  remoteState: ResourceKey | null;
}
```

#### kind

```ts
kind: "resource";
```

indicates this diff describes a `to-one` relationship

#### localState

```ts
localState: ResourceKey | null;
```

the relationship's member including any local (uncommitted) change

#### remoteState

```ts
remoteState: ResourceKey | null;
```

the relationship's member as last known from the API

## Example

```ts
const diff: RelationshipDiff = {
  kind: 'collection',
  remoteState: [],
  additions: new Set([resourceKey]),
  removals: new Set(),
  localState: [resourceKey],
  reordered: false,
};
```
