/**
 * This package provides [*Ember***Data**](https://github.com/warp-drive-data/warp-drive/)'s `Store` class.
 *
 * A {@link Store} coordinates interaction between your application, a {@link Cache},
 * and sources of data (such as your API or a local persistence layer) accessed via a {@link RequestManager}.
 *
 * Optionally, a Store can be configured to hydrate the response data into rich presentation classes.
 *
 * ## 🔨 Creating A Store
 *
 * To use a `Store` we will need to do few things: add a {@link Cache}
 * to store data **in-memory**, add a {@link Handler} to fetch data from a source,
 * and implement `instantiateRecord` to tell the store how to display the data for individual resources.
 *
 * > **Note**
 * > If you are using the package `ember-data` then a JSON:API cache, RequestManager, LegacyNetworkHandler,
 * > and `instantiateRecord` are configured for you by default.
 *
 * ### Configuring A Cache
 *
 * To start, let's install a [JSON:API](https://jsonapi.org/) cache. If your app uses `GraphQL` or `REST` other
 * caches may better fit your data. You can author your own cache by creating one that
 * conforms to the {@link Cache | spec}.
 *
 * The package `@ember-data/json-api` provides a [JSON:API](https://jsonapi.org/) cache we can use.
 * After installing it, we can configure the store to use this cache.
 *
 * ```js
 * import Store from '@ember-data/store';
 * import Cache from '@ember-data/json-api';
 *
 * class extends Store {
 *   createCache(storeWrapper) {
 *     return new Cache(storeWrapper);
 *   }
 * }
 * ```
 *
 * Now that we have a `cache` let's setup something to handle fetching
 * and saving data via our API.
 *
 * > **Note**
 * > The `ember-data` package automatically includes and configures
 * > the `@ember-data/json-api` cache for you.
 *
 * ### Handling Requests
 *
 * When *Ember***Data** needs to fetch or save data it will pass that request to your application's `RequestManager` for fulfillment. How this fulfillment occurs (in-memory, device storage, via single or multiple API requests, etc.) is then up to the registered request handlers.
 *
 * To start, let's install the `RequestManager` from `@ember-data/request` and the basic `Fetch` handler from ``@ember-data/request/fetch`.
 *
 * > **Note**
 * > If your app uses `GraphQL`, `REST` or different conventions for `JSON:API` than your cache expects, other handlers may better fit your data. You can author your own handler by creating one that conforms to the [handler interface](https://github.com/warp-drive-data/warp-drive/tree/main/packages/request#handling-requests).
 *
 * ```ts
 * import Store from '@ember-data/store';
 * import RequestManager from '@ember-data/request';
 * import Fetch from '@ember-data/request/fetch';
 *
 * export default class extends Store {
 *   requestManager = new RequestManager()
 *    .use([Fetch]);
 * }
 * ```
 *
 * **Using RequestManager as a Service**
 *
 * Alternatively if you have configured the `RequestManager` to be a service you may re-use it.
 *
 * *app/services/request.js*
 * ```ts
 * import RequestManager from '@ember-data/request';
 * import Fetch from '@ember-data/request/fetch';
 *
 * export default {
 *   create() {
 *     return new RequestManager()
 *       .use([Fetch])
 *       .useCache(CacheHandler);
 *   }
 * }
 * ```
 *
 * *app/services/store.js*
 * ```ts
 * import Store from '@ember-data/store';
 * import { service } from '@ember/service';
 *
 * export default class extends Store {
 *   @service('request') requestManager
 * }
 * ```
 *
 *
 * ### Presenting Data from the Cache
 *
 * Now that we have a source and a cache for our data, we need to configure how
 * the Store delivers that data back to our application. We do this via the {@link Store.instantiateRecord | instantiateRecord hook}
 * which allows us to transform the data for a resource before handing it to the application.
 *
 * A naive way to present the data would be to return it as JSON. Typically instead
 * this hook will be used to add reactivity and make each unique resource a singleton,
 * ensuring that if the cache updates our presented data will reflect the new state.
 *
 * Below is an example of using the hooks `instantiateRecord` and a `teardownRecord`
 * to provide minimal read-only reactive state for simple resources.
 *
 * ```ts
 * import Store, { recordIdentifierFor } from '@ember-data/store';
 * import { TrackedObject } from 'tracked-built-ins';
 *
 * class extends Store {
 *   instantiateRecord(identifier) {
 *     const { cache, notifications } = this;
 *
 *     // create a TrackedObject with our attributes, id and type
 *     const record = new TrackedObject(Object.assign({}, cache.peek(identifier)));
 *     record.type = identifier.type;
 *     record.id = identifier.id;
 *
 *     notifications.subscribe(identifier, (_, change) => {
 *       if (change === 'attributes') {
 *         Object.assign(record, cache.peek(identifier));
 *       }
 *     });
 *
 *     return record;
 *   }
 * }
 * ```
 *
 * Because `instantiateRecord` is opaque to the nature of the record, an implementation
 * can be anything from a fairly simple object to a robust proxy that intelligently links
 * together associated records through relationships.
 *
 * This also enables creating a record that separates `edit` flows from `create` flows
 * entirely. A record class might choose to implement a `checkout`method that gives access
 * to an editable instance while the primary record continues to be read-only and reflect
 * only persisted (non-mutated) state.
 *
 * Typically you will choose an existing record implementation such as `@ember-data/model`
 * for your application.
 *
 * Because of the boundaries around instantiation and the cache, record implementations
 * should be capable of interop both with each other and with any `Cache`. Due to this,
 * if needed an application can utilize multiple record implementations and multiple cache
 * implementations either to support enhanced features for only a subset of records or to
 * be able to incrementally migrate from one record/cache to another record or cache.
 *
 * > **Note**
 * > The `ember-data` package automatically includes the `@ember-data/model`
 * > package and configures it for you.
 *
 * @module
 */
import { deprecate } from '@ember/debug';

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type RequestManager, Store } from '@warp-drive/core';
import { DEPRECATE_TRACKING_PACKAGE } from '@warp-drive/core/build-config/deprecations';
import { setupSignals } from '@warp-drive/core/configure';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Handler } from '@warp-drive/core/request';
import { peekTransient } from '@warp-drive/core/types/-private';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Cache } from '@warp-drive/core/types/cache';

export { Store as default };

export {
  type StoreRequestContext,
  CacheHandler,
  type Document,
  type CachePolicy,
  type StoreRequestInput,
  recordIdentifierFor,
  storeFor,
  type DocumentCacheOperation,
  type CacheOperation,
  type NotificationType,
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
  setKeyInfoForResource,
} from '@warp-drive/core';

if (DEPRECATE_TRACKING_PACKAGE) {
  let hasEmberDataTracking = false;
  let hasWarpDriveEmber = false;
  let hasRegisteredFromEmberPackage = false;

  if (macroCondition(dependencySatisfies('@warp-drive/ember', '*'))) {
    hasWarpDriveEmber = true;
    hasRegisteredFromEmberPackage = peekTransient('signalHooks') !== null;
  }

  if (macroCondition(dependencySatisfies('@ember-data/tracking', '*'))) {
    hasEmberDataTracking = true;

    if (!hasRegisteredFromEmberPackage) {
      // @ts-expect-error
      const { buildSignalConfig } = importSync('@ember-data/tracking');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      setupSignals(buildSignalConfig);
    }
  }

  // we should probably still print here if @ember-data/tracking is present
  if (!hasRegisteredFromEmberPackage) {
    const message = [
      `Using WarpDrive with EmberJS requires configuring it to use Ember's reactivity system.`,
      `Previously this was provided by installing the package '@ember-data/tracking', but this package is now deprecated.`,
      ``,
      `To resolve this deprecation, follow these steps:`,
      hasEmberDataTracking
        ? `- remove "@ember-data/tracking" and (if needed) "@ember-data-types/tracking" from your project in both your package.json and tsconfig.json`
        : false,
      hasWarpDriveEmber ? false : `- add "@warp-drive/ember" to your project in your package.json (and run install)`,
      '- add the following import to your app.js file:',
      '',
      '\t```',
      `\timport '@warp-drive/ember/install';`,
      '\t```',
      ``,
      '- mark this deprecation as resolved in your project by adding the following to your WarpDrive config in ember-cli-build.js:',
      '',
      '\t```',
      '\tconst { setConfig } = await import("@warp-drive/build-config");',
      '\tsetConfig(app, __dirname, {',
      '\t  deprecations: {',
      '\t    DEPRECATE_TRACKING_PACKAGE: false,',
      '\t  },',
      '\t});',
      '\t```',
      ``,
      `For more information, see the Package Unification RFC: https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/`,
    ]
      .filter((l) => l !== false)
      .join('\n');

    deprecate(message, false, {
      id: 'warp-drive.deprecate-tracking-package',
      until: '6.0.0',
      for: 'warp-drive',
      since: {
        enabled: '5.3.4',
        available: '4.13',
      },
      url: 'https://deprecations.emberjs.com/id/warp-drive.deprecate-tracking-package',
    });
  }
}
