---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/spec/json-api-raw/types/SingleResourceDocument.md
description: >-
  A raw {json:api} document whose `data` is one existing resource object, with
  optional `included`, `meta`, and `links`.
---

# &#x20;SingleResourceDocument\<T *extends* `string` = `string`>

```ts
type SingleResourceDocument<T extends string = string> = Document & {
  data: ExistingResourceObject<T>;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:418](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L418)

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
