---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_STORE_EXTENDS_EMBER_OBJECT.md
---

# &#x20;DEPRECATE\_STORE\_EXTENDS\_EMBER\_OBJECT&#x20;

```ts
const DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/deprecations.d.ts:411](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/deprecations.d.ts#L411)

When the flag is `true` (default), the Store class will extend from `@ember/object`.
When the flag is `false` or `ember-source` is not present, the Store will not extend
from EmberObject.

## Until

6.0
