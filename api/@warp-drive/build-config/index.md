---
url: https://canary.warp-drive.io/api/@warp-drive/build-config.md
description: >-
  (Legacy) Home of the `setConfig` build plugin that configures WarpDrive
  deprecations, optional features and debug logging; new apps should use
  `@warp-drive/core/build-config` instead.
---

&#x20;

:::warning Legacy package
`@warp-drive/build-config` is a legacy package. New code should use [`@warp-drive/core/build-config`](/api/@warp-drive/core/build-config/) instead.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
:::

This package is the implementation home of the `setConfig` build plugin that configures
deprecations, optional features, development/testing support and debug logging. Apps import it
as [@warp-drive/core/build-config](../core/build-config/index.md), which re-exports every
entry point below; the documentation for each lives on the `@warp-drive/core` page it maps to.

Apps still importing from this package configure it with `setConfig` in `ember-cli-build`:

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

* [debugging](../core/build-config/debugging/index.md)
* [deprecations](../core/build-config/deprecations/index.md)
* [features](../core/build-config/canary-features/index.md)
* [polyfillUUID](../core/build-config/types/WarpDriveConfig.md#polyfilluuid)
* [includeDataAdapterInProduction](../core/build-config/types/WarpDriveConfig.md#includedataadapterinproduction)
* [compatWith](../core/build-config/types/WarpDriveConfig.md#compatwith)

Every entry point maps to its `@warp-drive/core` equivalent:

| `@warp-drive/build-config` entry | re-exported as                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.` (root)                       | [@warp-drive/core/build-config](../core/build-config/index.md)                                 |
| `/babel-macros`                  | [@warp-drive/core/build-config/babel-macros](../core/build-config/babel-macros/index.md)       |
| `/canary-features`               | [@warp-drive/core/build-config/canary-features](../core/build-config/canary-features/index.md) |
| `/debugging`                     | [@warp-drive/core/build-config/debugging](../core/build-config/debugging/index.md)             |
| `/deprecations`                  | [@warp-drive/core/build-config/deprecations](../core/build-config/deprecations/index.md)       |
| `/env`                           | `@warp-drive/core/build-config/env` (internal, no API page)                                         |
| `/macros`                        | `@warp-drive/core/build-config/macros` (internal, no API page)                                      |
