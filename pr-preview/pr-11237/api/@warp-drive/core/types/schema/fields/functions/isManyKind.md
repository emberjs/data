---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/core/types/schema/fields/functions/isManyKind.md
---

# &#x20;isManyKind()

```ts
function isManyKind(kind: string): kind is "collection" | "hasMany";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2716](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/schema/fields.ts#L2716)

Whether a field kind is a to-many relationship: the legacy `hasMany` or the
`collection` kind.

## Parameters

### kind

`string`

## Returns

kind is "collection" | "hasMany"
