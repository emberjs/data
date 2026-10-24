---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/spec/json-api-raw/types/SingleResourceDocument.md
---

# &#x20;SingleResourceDocument\<T *extends* `string` = `string`>

```ts
type SingleResourceDocument<T extends string = string> = Document & {
  data: ExistingResourceObject<T>;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:372](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L372)

Represents a {json:api} document containing a single resource.

## Type Declaration

### data

```ts
data: ExistingResourceObject<T>;
```

the resource the document represents

## Type Parameters

### T

`T` *extends* `string` = `string`

## Example

```json
{
  "data": { "type": "user", "id": "1", "attributes": { "name": "Chris" } }
}
```
