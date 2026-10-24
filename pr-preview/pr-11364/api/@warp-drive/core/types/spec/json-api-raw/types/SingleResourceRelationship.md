---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/types/spec/json-api-raw/types/SingleResourceRelationship.md
description: >-
  A to-one {json:api} relationship object whose `data` is a single resource
  identifier or `null`, with optional `meta` and `links`.
---

# &#x20;SingleResourceRelationship\<T = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`>

```ts
interface SingleResourceRelationship<T = ExistingResourceIdentifierObject | NewResourceIdentifierObject> {
  data?: T | null;
  links?: Links;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:231](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L231)

Represents a `to-one` {json:api} relationship.

[{json:api} Spec](https://jsonapi.org/format/#document-resource-object-relationships)

## Example

```json
{
  "data": { "type": "user", "id": "1" }
}
```

## Type Parameters

### T

`T` = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`

## Properties

### data?

```ts
optional data?: T | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:235](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L235)

the related resource, or `null` if the relationship has no related resource

***

### links?

```ts
optional links?: Links;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:243](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L243)

links related to the relationship

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:239](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L239)

meta information about the relationship
