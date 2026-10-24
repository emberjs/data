---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/legacy/compat/utils/functions/configureTypeNormalization.md
---

&#x20;

# &#x20;configureTypeNormalization()

```ts
function configureTypeNormalization(fn: (type: string) => string): void;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:70](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/utils.ts#L70)

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
