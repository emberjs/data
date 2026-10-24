---
url: https://canary.warp-drive.io/pr-preview/pr-11286/guides/configuration.md
description: >-
  Set up WarpDrive's babel build plugin with compatWith and create a store with
  useRecommendedStore or useLegacyStore, the two steps required before making
  any request.
---

::: warning 💡 Looking for the [Legacy Package Setup Guide?](./legacy-package-setup/setup/universal)
:::

# Setup

Before we start working with our data we need to configure ***Warp*Drive**'s [build plugin](#configure-the-build-plugin) and
a [Store](#configure-the-store) to manage our data.

## Configure the Build Plugin

***Warp*Drive** uses a [babel plugin](https://www.npmjs.com/package/@embroider/macros) to inject app-specific [configuration](/api/@warp-drive/core/build-config/types/WarpDriveConfig) allowing us to provide advanced dev-mode debugging features, deprecation management, and canary feature toggles.

For most projects, the configuration is done inside of the project's babel configuration file.
For ember apps that still have an `ember-cli-build` file, this plugin comes built-in to the
toolchain and all you need to do is provide it the desired configuration in `ember-cli-build`.

::: tabs key:paradigm

\== Simple Config

```ts [babel.config.mjs]
import { babelPlugin } from '@warp-drive/core/build-config';

const macros = babelPlugin({
  // for universal apps this MUST be at least 5.6
  compatWith: '5.6',
});

export default {
  plugins: [
    ...macros.js
  ]
}
```

\== Advanced Config

```ts [babel.config.mjs]
import { setConfig } from '@warp-drive/core/build-config';
import { buildMacros } from '@embroider/macros/babel';

const Macros = buildMacros({
  configure: (config) => {
    setConfig(config, {
      // for universal apps this MUST be at least 5.6
      compatWith: '5.6'
    });
  },
});

export default {
  plugins: [
    // babel-plugin-debug-macros is temporarily needed
    // to convert deprecation/warn calls into console.warn
    [
      'babel-plugin-debug-macros',
      {
        flags: [],

        debugTools: {
          isDebug: process.env.NODE_ENV !== 'production',
          source: '@ember/debug',
          assertPredicateIndex: 1,
        },
      },
      'ember-data-specific-macros-stripping-test',
    ],
    ...Macros.babelMacros,
  ],
};
```

\== Ember Apps

```ts [ember-cli-build.js]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/core/build-config'); // [!code focus]
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:9]
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    compatWith: '4.12',
    deprecations: {
      // ... list individual deprecations that have been resolved here
    }
  });

  return compatBuild(app, buildOnce);
};
```

:::

## Configure The Store

The `Store` is the central piece of the ***Warp*Drive** experience, linking
together how we handle requests, the schemas for what our data looks like,
how to cache it, and what sort of reactive objects to create for that data.

***Warp*Drive** provides [a utility to quickly setup a store configured
with recommended defaults](/api/@warp-drive/core/functions/useRecommendedStore).

:::tabs

\== 🚧 PolarisMode (preview)

> \[!WARNING]
> [PolarisMode](/guides/the-manual/schemas/resources/polaris-mode.md) Isn't quite ready!

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export default useRecommendedStore({
  cache: JSONAPICache,
  schemas: [
     // -- your schemas here
  ],
});
```

\== LegacyMode (recommended, Ember Only)

> \[!TIP]
> While [LegacyMode](/guides/the-manual/schemas/resources/legacy-mode.md) can work with
> Non-Ember apps, we recommend waiting for [PolarisMode](/guides/the-manual/schemas/resources/polaris-mode.md) to become recommended in V6, or limit usage to experimental exploration.

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  modelFragments: true,
  cache: JSONAPICache,
  schemas: [
     // -- your schemas here
  ],
});
```

:::

**That's it!** It's time to start working with your data.

Alternatively, to understand more about what the above setup does, you can
read about manually configuring the store in the [Advanced Guide](./advanced.md)
