---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_STORE_EXTENDS_EMBER_OBJECT.md
description: >-
  Deprecation flag controlling whether the Store extends `@ember/object`; set it
  to `false` to stop extending EmberObject.
---

# &#x20;DEPRECATE\_STORE\_EXTENDS\_EMBER\_OBJECT&#x20;

```ts
const DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: boolean;
```

Defined in: [warp-drive-packages/build-config/src/deprecations.ts:438](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/build-config/src/deprecations.ts#L438)

When the flag is `true` (default), the Store class will extend from `@ember/object`.
When the flag is `false` or `ember-source` is not present, the Store will not extend
from EmberObject.

## Until

6.0
