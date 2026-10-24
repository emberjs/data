---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/build-config/deprecations/variables/DEPRECATE_MANY_ARRAY_DUPLICATES.md
---

# &#x20;DEPRECATE\_MANY\_ARRAY\_DUPLICATES&#x20;

```ts
const DEPRECATE_MANY_ARRAY_DUPLICATES: boolean = true;
```

Defined in: [deprecations.ts:407](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/build-config/src/deprecations.ts#L407)

When the flag is `true` (default), adding duplicate records to a `ManyArray`
is deprecated in non-production environments. In production environments,
duplicate records added to a `ManyArray` will be deduped and no error will
be thrown.

When the flag is `false`, an error will be thrown when duplicates are added.

## Until

6.0
