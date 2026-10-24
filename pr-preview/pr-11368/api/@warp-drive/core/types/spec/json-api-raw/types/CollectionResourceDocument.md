---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/spec/json-api-raw/types/CollectionResourceDocument.md
description: >-
  A raw {json:api} document whose `data` is an array of existing resource
  objects, with optional `included`, `meta`, and `links`.
---

# &#x20;CollectionResourceDocument\<T *extends* `string` = `string`>

```ts
type CollectionResourceDocument<T extends string = string> = Document & {
  data: ExistingResourceObject<T>[];
};
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:437](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L437)

Represents a {json:api} document containing a collection of resources.

## Type Declaration

### data

```ts
data: ExistingResourceObject<T>[];
```

the resources the document represents

## Type Parameters

### T

`T` *extends* `string` = `string`

## Example

```json
{
  "data": [{ "type": "user", "id": "1", "attributes": { "name": "Chris" } }]
}
```
