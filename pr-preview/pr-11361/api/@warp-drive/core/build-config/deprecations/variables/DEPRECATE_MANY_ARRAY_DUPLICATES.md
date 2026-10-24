---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_MANY_ARRAY_DUPLICATES.md
description: >-
  Deprecation flag for adding duplicate records to a ManyArray; when `false`,
  adding duplicates throws an error instead of being deduped.
---

# &#x20;DEPRECATE\_MANY\_ARRAY\_DUPLICATES&#x20;

```ts
const DEPRECATE_MANY_ARRAY_DUPLICATES: boolean;
```

Defined in: [warp-drive-packages/build-config/src/deprecations.ts:423](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/build-config/src/deprecations.ts#L423)

When the flag is `true` (default), adding duplicate records to a `ManyArray`
is deprecated in non-production environments. In production environments,
duplicate records added to a `ManyArray` will be deduped and no error will
be thrown.

When the flag is `false`, an error will be thrown when duplicates are added.

## Until

6.0
