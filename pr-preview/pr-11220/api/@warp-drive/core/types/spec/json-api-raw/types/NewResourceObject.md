---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/spec/json-api-raw/types/NewResourceObject.md
description: >-
  A raw {json:api} resource object for a client-created resource not yet
  persisted, identified by `type` and `lid` with an `id` that may be `null`.
---

# &#x20;NewResourceObject\<T *extends* `string` = `string`>

```ts
type NewResourceObject<T extends string = string> = NewResourceIdentifierObject<T> & {
  attributes?: ObjectValue;
  links?: Links;
  meta?: Meta;
  relationships?: ResourceRelationshipsObject;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:345](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L345)

Represents a new resource that has not yet been persisted, as it would
appear in a {json:api} document (for instance, the body of a `POST` request).

## Type Declaration

### attributes?

```ts
optional attributes?: ObjectValue;
```

the resource's attributes

### links?

```ts
optional links?: Links;
```

links related to the resource

### meta?

```ts
optional meta?: Meta;
```

meta information about the resource

### relationships?

```ts
optional relationships?: ResourceRelationshipsObject;
```

the resource's relationships to other resources

## Type Parameters

### T

`T` *extends* `string` = `string`

## Example

```json
{
  "data": {
    "type": "user",
    "lid": "@lid:user-1",
    "attributes": { "name": "Chris" }
  }
}
```
