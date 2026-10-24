---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/build-config/deprecations/variables/DISABLE_7X_DEPRECATIONS.md
---

# &#x20;DISABLE\_7X\_DEPRECATIONS&#x20;

```ts
const DISABLE_7X_DEPRECATIONS: boolean = true;
```

Defined in: [deprecations.ts:543](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/build-config/src/deprecations.ts#L543)

This is a special flag that can be used to opt-in early to receiving deprecations introduced in 6.x
which have had their infra backported to 5.x versions of ***Warp*Drive**.

When this flag is not present or set to `true`, the deprecations from the 6.x branch
will not print their messages and the deprecation cannot be resolved.

When this flag is present and set to `false`, the deprecations from the 6.x branch will
print and can be resolved.

## Until

7.0
