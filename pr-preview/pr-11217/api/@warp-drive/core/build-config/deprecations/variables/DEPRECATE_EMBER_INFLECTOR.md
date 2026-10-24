---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_EMBER_INFLECTOR.md
description: >-
  Deprecation flag for using ember-inflector for pluralization and
  singularization instead of the `@ember-data/request-utils/string` utilities.
---

# &#x20;DEPRECATE\_EMBER\_INFLECTOR&#x20;

```ts
const DEPRECATE_EMBER_INFLECTOR: boolean;
```

Defined in: [warp-drive-packages/build-config/src/deprecations.ts:497](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/build-config/src/deprecations.ts#L497)

Deprecates the use of ember-inflector for pluralization and singularization in favor
of the `@ember-data/request-utils` package.

Rule configuration methods (singular, plural, uncountable, irregular) and
usage methods (singularize, pluralize) are are available as imports from
`@ember-data/request-utils/string`

Notable differences with ember-inflector:

* there cannot be multiple inflector instances with separate rules
* pluralization does not support a count argument
* string caches now default to 10k entries instead of 1k, and this
  size is now configurable. Additionally, the cache is now a LRU cache
  instead of a first-N cache.

This deprecation can be resolved by removing usage of ember-inflector or by using
both ember-inflector and @ember-data/request-utils in parallel and updating your
WarpDrive build config to mark the deprecation as resolved
in ember-cli-build

```js
setConfig(app, __dirname, { deprecations: { DEPRECATE_EMBER_INFLECTOR: false }});
```

## Until

6.0
