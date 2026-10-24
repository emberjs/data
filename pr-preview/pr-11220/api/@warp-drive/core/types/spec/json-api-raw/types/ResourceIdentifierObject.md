---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/spec/json-api-raw/types/ResourceIdentifierObject.md
description: >-
  A reference to a resource in any form the cache accepts: `lid` only, `type`
  plus `id`, or a new resource's `type` plus `lid`.
---

# &#x20;ResourceIdentifierObject\<T *extends* `string` = `string`>

```ts
type ResourceIdentifierObject<T extends string = string> = 
  | ResourceIdentifier
  | ExistingResourceIdentifierObject<T>
| NewResourceIdentifierObject<T>;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:211](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L211)

A reference to a resource, in any of the forms WarpDrive's cache accepts.

See also:

* [ResourceIdentifier](ResourceIdentifier.md)
* ExistingResourceIdentifierObject
* NewResourceIdentifierObject

[{json:api} Spec](https://jsonapi.org/format/#document-resource-identifier-objects)

## Type Parameters

### T

`T` *extends* `string` = `string`
