---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/build-config.md
---

:::warning ⚠️ This package has been merged into [@warp-drive/core](../core/index.md) and is not recommended for new applications
:::

This package provides a build-plugin that enables configuration of deprecations,
optional features, development/testing support and debug logging.

This configuration is done using `setConfig` in `ember-cli-build`.

```ts [ember-cli-build.js]
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]

  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:3]
    // settings here
  });

  const { buildOnce } = await import('@embroider/vite');
  const { compatBuild } = await import('@embroider/compat');

  return compatBuild(app, buildOnce);
};

```

Available settings include:

* [debugging](debugging/index.md)
* [deprecations](deprecations/index.md)
* [features](canary-features/index.md)
* [polyfillUUID](types/WarpDriveConfig.md#polyfilluuid)
* [includeDataAdapterInProduction](types/WarpDriveConfig.md#includedataadapterinproduction)
* [compatWith](types/WarpDriveConfig.md#compatwith)

## Functions

* [babelPlugin](functions/babelPlugin.md)
* [setConfig](functions/setConfig.md)

## Types

* [WarpDriveConfig](types/WarpDriveConfig.md)
