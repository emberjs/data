---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/build-config/deprecations/variables/DEPRECATE_NON_STRICT_ID.md
---

# &#x20;DEPRECATE\_NON\_STRICT\_ID&#x20;

```ts
const DEPRECATE_NON_STRICT_ID: boolean = true;
```

Defined in: [deprecations.ts:185](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/build-config/src/deprecations.ts#L185)

Currently, WarpDrive expects that the `id` property associated with
a resource is a string.

However, for legacy support in many locations we would accept a number
which would then immediately be coerced into a string.

We are deprecating this legacy support for numeric IDs.

The goal is that in the future, you will be able to use any ID format
so long as everywhere you refer to the ID you use the same format.

However, for identifiers we will always use string IDs and so any
custom identifier configuration should provide a string ID.

## Until

6.0
