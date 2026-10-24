---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/legacy/compat/utils/functions/configureTypeNormalization.md
description: >-
  Legacy migration helper that replaces the singularize-and-dasherize function
  `formattedType` and `isEquivType` use to normalize resource types.
---

&#x20;

# &#x20;configureTypeNormalization()

```ts
function configureTypeNormalization(fn: (type: string) => string): void;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:78](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/legacy/src/compat/utils.ts#L78)

Configure a function to be called to normalize
a resource type string. Used by both formattedType
and isEquivType to ensure consistent normalization
during comparison.

If validation fails or the type turns out be unnormalized
the configured mismatch reporter and assert functions will
be called.

## Parameters

### fn

(`type`: `string`) => `string`

a function which takes a string and returns a string

## Returns

`void`
