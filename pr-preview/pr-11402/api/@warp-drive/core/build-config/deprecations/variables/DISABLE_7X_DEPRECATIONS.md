---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/build-config/deprecations/variables/DISABLE_7X_DEPRECATIONS.md
description: >-
  Opt-in flag: set it to `false` to make deprecations backported from 6.x print
  and become resolvable; by default they stay silent and unresolvable.
---

# &#x20;DISABLE\_7X\_DEPRECATIONS&#x20;

```ts
const DISABLE_7X_DEPRECATIONS: boolean;
```

Defined in: [warp-drive-packages/build-config/src/deprecations.ts:571](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/build-config/src/deprecations.ts#L571)

This is a special flag that can be used to opt-in early to receiving deprecations introduced in 6.x
which have had their infra backported to 5.x versions of ***Warp*Drive**.

When this flag is not present or set to `true`, the deprecations from the 6.x branch
will not print their messages and the deprecation cannot be resolved.

When this flag is present and set to `false`, the deprecations from the 6.x branch will
print and can be resolved.

## Until

7.0
