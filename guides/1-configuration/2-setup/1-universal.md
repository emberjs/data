# Setup

::: tip Boilerplate Sucks 👎🏽
We're re-aligning our packages into a new streamlined installation and setup experience.<br>
Below you'll find the current *boilerplate heavy* setup.

Curious? Read the [RFC](https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/)
:::

***Warp*Drive** uses a [babel plugin](https://www.npmjs.com/package/@embroider/macros) to inject app-specific configuration allowing us to provide advanced dev-mode debugging features, deprecation management, and canary feature toggles.

For Ember.js, this plugin comes built-in to the toolchain and all you need to do is provide it
the desired configuration in `ember-cli-build`. For all other projects, the configuration
is done inside of the app's babel configuration file.

::: code-group

```ts [New Ember Apps]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:7]
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    // for new apps it should be the version you installed
    compatWith: '5.5'
  });

  return compatBuild(app, buildOnce);
};
```

```ts [Existing Ember Apps]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:8]
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    compatWith: '4.12'
    deprecations: {
      // ... list individual deprecations that have been resolved here
    }
  });

  return compatBuild(app, buildOnce);
};
```

```ts [Universal Apps]
```

:::

::: code-group

```ts [Polaris/Legacy via SchemaRecord]
import Store, { CacheHandler } from '@ember-data/store';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

import JSONAPICache from '@ember-data/json-api';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { instantiateRecord, SchemaService, teardownRecord } from '@warp-drive/schema-record';

export default class Store extends DataStore {
  requestManager = new RequestManager().use([Fetch]).useCache(CacheHandler);

  createSchemaService() {
    return new SchemaService();
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: StableRecordIdentifier, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}

```

```ts [Legacy via Model]
```

```ts [Migration]
```

:::

The WarpDrive experience is assembled from four key primitives

- a cache
- a request manager
- a reactive object
- a schema source

- setup how you want to handle requests

- decide which cache to use
- supply a source of schema
- configure how reactive objects are created

- configure the reactivity system you want to use
- configure WarpDrive's build plugin
- configure typescript
- add the ESLint plugin to your eslint config
- [optional] configure support for legacy APIs
