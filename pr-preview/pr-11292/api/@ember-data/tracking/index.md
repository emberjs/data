---
url: https://canary.warp-drive.io/pr-preview/pr-11292/api/@ember-data/tracking.md
---

:::warning ⚠️ Deprecated in 5.5
This package historically provided the bindings into Ember's reactivity system. It is no longer
needed: that configuration now comes from [@warp-drive/ember](../../@warp-drive/ember/index.md).
:::

Historically, this package configured ***Warp*Drive** to use EmberJS's reactivity system.

## Migration Guide

To resolve this deprecation, follow these steps:

### 1. Remove @ember-data/tracking

* Remove `@ember-data/tracking` from package.json (if using `ember-data` this may not be present)
* Remove the `@ember-data/tracking` entry from the `types` array in tsconfig.json, if present
* If using `untracked`, change to using `untrack` from `@glimmer/validator`

### 2. Add @warp-drive/ember

* Add `@warp-drive/ember` to package.json - the version to install should match the version of `ember-data` or `@ember-data/store`
* Do NOT add `@warp-drive/ember` to tsconfig.json - the types in this package install automatically, you can remove any entry for this if it is there
* Add `import '@warp-drive/ember/install';` to the top of your `app.js` or `app.ts` file

### 3. Clear the deprecation

Once the above steps are complete, the deprecation can be silenced and the automatic fallback
registration of reactivity from `@ember-data/tracking` can be removed by updating your
[WarpDrive Build Config](../../@warp-drive/build-config/index.md) in your `ember-cli-build` file. On current
versions `setConfig` is exported from `@warp-drive/core/build-config`; `@warp-drive/build-config` is its
older home and still works. Set `compatWith` to the most recent `major.minor` your app has fully resolved
deprecations for, not to the `4.12` shown.

```js [ember-cli-build.js]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:9]
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    compatWith: '4.12',
    deprecations: {
      // ... list individual deprecations that have been resolved here
      DEPRECATE_TRACKING_PACKAGE: false // [!code highlight]
    }
  });

  return compatBuild(app, buildOnce);
};
```

## Functions

* [~~buildSignalConfig~~](functions/buildSignalConfig.md)
