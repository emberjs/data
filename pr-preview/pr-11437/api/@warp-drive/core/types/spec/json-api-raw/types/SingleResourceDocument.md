---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/core/types/spec/json-api-raw/types/SingleResourceDocument.md
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

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:418](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L418)

Represents a {json:api} document containing a single resource.

## Type Parameters

### T

`T` *extends* `string` = `string`

## Type Declaration

### data

```ts
data: ExistingResourceObject<T>;
```

the resource the document represents

## Example

```json
{
  "data": { "type": "user", "id": "1", "attributes": { "name": "Chris" } }
}
```
