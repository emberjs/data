---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/spec/json-api-raw/types/ResourceRelationshipsObject.md
---

# &#x20;ResourceRelationshipsObject\<T = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`>

```ts
type ResourceRelationshipsObject<T = ExistingResourceIdentifierObject | NewResourceIdentifierObject> = Record<string, InnerRelationshipDocument<T>>;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:263](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L263)

The `relationships` member of a {json:api} resource object, keyed
by relationship name.

[{json:api} Spec](https://jsonapi.org/format/#document-resource-object-relationships)

## Type Parameters

### T

`T` = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`
