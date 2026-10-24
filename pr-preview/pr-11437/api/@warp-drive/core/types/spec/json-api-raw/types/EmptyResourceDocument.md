---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/core/types/spec/json-api-raw/types/EmptyResourceDocument.md
description: >-
  A raw {json:api} document whose `data` is `null`, such as the response to a
  `DELETE` request.
---

# &#x20;EmptyResourceDocument

```ts
type EmptyResourceDocument = Document & {
  data: null;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:399](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L399)

Represents a {json:api} document containing no resource, for
instance the response to a `DELETE` request or a `to-one`
relationship pointing at nothing.

## Type Declaration

### data

```ts
data: null;
```

always `null` for an empty resource document

## Example

```json
{ "data": null }
```
