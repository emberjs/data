---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/schema/fields/functions/isRelationshipKind.md
---

# &#x20;isRelationshipKind()

```ts
function isRelationshipKind(kind: string): kind is "resource" | "collection" | "belongsTo" | "hasMany";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2735](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2735)

Whether a field kind is any relationship kind, legacy or not.

## Parameters

### kind

`string`

## Returns

kind is "resource" | "collection" | "belongsTo" | "hasMany"
