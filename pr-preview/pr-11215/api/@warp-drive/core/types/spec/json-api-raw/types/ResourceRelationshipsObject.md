---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/spec/json-api-raw/types/ResourceRelationshipsObject.md
description: >-
  The `relationships` member of a {json:api} resource object: to-one or to-many
  relationship objects keyed by relationship name.
---

# &#x20;ResourceRelationshipsObject\<T = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`>

```ts
type ResourceRelationshipsObject<T = ExistingResourceIdentifierObject | NewResourceIdentifierObject> = Record<string, InnerRelationshipDocument<T>>;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:298](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L298)

The `relationships` member of a {json:api} resource object, keyed
by relationship name.

[{json:api} Spec](https://jsonapi.org/format/#document-resource-object-relationships)

## Type Parameters

### T

`T` = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`
