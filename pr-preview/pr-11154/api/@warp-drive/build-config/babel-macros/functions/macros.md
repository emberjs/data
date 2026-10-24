---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/build-config/babel-macros/functions/macros.md
---

# &#x20;macros()

```ts
function macros(): BabelPlugin[];
```

Defined in: [babel-macros.ts:54](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/build-config/src/babel-macros.ts#L54)

## Returns

`BabelPlugin`\[]

an array of Babel plugins that can be used for code-stripping
based on the configuration supplied to `setConfig` and the current ENV.

* deprecation constants imported from `@warp-drive/build-config/deprecations`
* feature flags imported from `@warp-drive/build-config/canary-features`
* debug logging constants imported from `@warp-drive/build-config/debugging`
* environment constants imported from `@warp-drive/build-config/env`
* expressionts imported from `@warp-drive/build-config/macros`
