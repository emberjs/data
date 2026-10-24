---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/build-config/babel-macros/functions/macros.md
description: >-
  Returns the Babel plugin entries that turn WarpDrive deprecation,
  canary-feature, debug-logging, env, and assert imports into build-time
  code-stripping macros.
---

# &#x20;macros()

```ts
function macros(): BabelPlugin[];
```

Defined in: [warp-drive-packages/build-config/src/babel-macros.ts:58](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/build-config/src/babel-macros.ts#L58)

## Returns

`BabelPlugin`\[]

an array of Babel plugins that can be used for code-stripping
based on the configuration supplied to `setConfig` and the current ENV.

* deprecation constants imported from `@warp-drive/build-config/deprecations`
* feature flags imported from `@warp-drive/build-config/canary-features`
* debug logging constants imported from `@warp-drive/build-config/debugging`
* environment constants imported from `@warp-drive/build-config/env`
* expressionts imported from `@warp-drive/build-config/macros`
