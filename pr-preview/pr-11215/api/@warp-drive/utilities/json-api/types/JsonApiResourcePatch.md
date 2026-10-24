---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/utilities/json-api/types/JsonApiResourcePatch.md
description: >-
  A JSON:API resource object holding only a record's changed attributes and
  relationships, as produced by `serializePatch`.
---

# &#x20;JsonApiResourcePatch

```ts
type JsonApiResourcePatch = 
  | {
  attributes?: Record<string, Value>;
  id: string;
  relationships?: Record<string, ChangedRelationshipData>;
  type: string;
}
  | {
  attributes?: Record<string, Value>;
  id: null;
  lid: string;
  relationships?: Record<string, ChangedRelationshipData>;
  type: string;
};
```

Defined in: [-private/json-api/serialize.ts:17](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/utilities/src/-private/json-api/serialize.ts#L17)

The resource object [serializePatch](../functions/serializePatch.md) produces: the resource's `type` and `id` (or `lid`
for a new record) with only its changed attributes and relationships.
