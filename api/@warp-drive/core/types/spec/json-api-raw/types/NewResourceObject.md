---
url: >-
  https://canary.warp-drive.io/api/@warp-drive/core/types/spec/json-api-raw/types/NewResourceObject.md
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

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:345](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L345)

Represents a new resource that has not yet been persisted, as it would
appear in a {json:api} document (for instance, the body of a `POST` request).

## Type Parameters

### T

`T` *extends* `string` = `string`

## Type Declaration

### attributes?

```ts
attributes?: ObjectValue;
```

the resource's attributes

### links?

```ts
links?: Links;
```

links related to the resource

### meta?

```ts
meta?: Meta;
```

meta information about the resource

### relationships?

```ts
relationships?: ResourceRelationshipsObject;
```

the resource's relationships to other resources

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
