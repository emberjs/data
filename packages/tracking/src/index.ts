/**
 * # ~~@ember-data/tracking~~ <Badge type="warning" text="deprecated v5.5" />
 *
 * Using ***Warp*Drive** with EmberJS requires configuring it to use Ember's reactivity system.
 *
 * ::: warning
 * The use of the package **@ember-data/tracking** is now deprecated. It
 * historically provided the bindings into Ember's reactivity system.
 *
 * This package is no longer needed as the configuration is now
 * provided by the package [@warp-drive/ember](../../@warp-drive/ember).
 * :::
 *
 * To resolve this deprecation, follow these steps:
 *
 * ## 1. Remove @ember-data/tracking
 *
 * - Remove `@ember-data/tracking` from package.json (if using `ember-data` this may not be present)
 * - Remove type imports for `@ember-data/tracking` from tsconfig.json
 * - If using `untracked`, change to using `untrack` from `@glimmer/validator`
 *
 * ## 2. Add @warp-drive/ember
 *
 * - Add `@warp-drive/ember` to package.json - the version to install should match the version of `ember-data` or `@ember-data/store`
 * - Do NOT add `@warp-drive/ember` to tsconfig.json - the types in this package install automatically, you can remove any entry for this if it is there
 * - Add `import '@warp-drive/ember/install';` to the top of your `app.js` or `app.ts` file
 *
 * ## 3. Clear the deprecation
 *
 * Once the above steps are complete, the deprecation can be silenced and the automatic fallback
 * registration of reactivity from `@ember-data/tracking` can be removed by updating your [WarpDrive
 * build config](../../@warp-drive/build-config) in your `ember-cli-build` file.
 *
 * ```js [ember-cli-build.js]
 * 'use strict';
 * const EmberApp = require('ember-cli/lib/broccoli/ember-app');
 * const { compatBuild } = require('@embroider/compat');
 *
 * module.exports = async function (defaults) {
 *   const { setConfig } = await import('@warp-drive/build-config'); // [!code focus]
 *   const { buildOnce } = await import('@embroider/vite');
 *   const app = new EmberApp(defaults, {});
 *
 *   setConfig(app, __dirname, { // [!code focus:9]
 *     // this should be the most recent <major>.<minor> version for
 *     // which all deprecations have been fully resolved
 *     // and should be updated when that changes
 *     compatWith: '4.12'
 *     deprecations: {
 *       // ... list individual deprecations that have been resolved here
 *       DEPRECATE_TRACKING_PACKAGE: false // [!code highlight]
 *     }
 *   });
 *
 *   return compatBuild(app, buildOnce);
 * };
 *```
 *
 * @deprecated in version 5.5.0
 * @module
 */
import { tagForProperty } from '@ember/-internals/metal';
import { _backburner } from '@ember/runloop';
import { consumeTag, createCache, dirtyTag, getValue, track, updateTag } from '@glimmer/validator';

import { importSync } from '@embroider/macros';

import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/core/build-config/deprecations';
import { TESTING } from '@warp-drive/core/build-config/env';

type Tag = ReturnType<typeof tagForProperty>;
const emberDirtyTag = dirtyTag as unknown as (tag: Tag) => void;

/**
 * <Badge type="warning" text="deprecated" />
 *
 * Creates a signal configuration object for WarpDrive that integrates with Ember's
 * reactivity system. This will be automatically imported and registered by
 * `@ember-data/store` if the deprecation has not been resolved.
 *
 * This function should not be called directly in your application code
 * and this package is deprecated entirely, see the [package overview](../../)
 * for more details.
 *
 * @deprecated
 * @public
 */
export function buildSignalConfig(options: {
  wellknown: {
    Array: symbol | string;
  };
}) {
  const ARRAY_SIGNAL = options.wellknown.Array;

  return {
    createSignal(obj: object, key: string | symbol): Tag | [Tag, Tag, Tag] {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (key === ARRAY_SIGNAL) {
          return [tagForProperty(obj, key), tagForProperty(obj, 'length'), tagForProperty(obj, '[]')] as const;
        }
      }
      return tagForProperty(obj, key);
    },
    consumeSignal(signal: Tag | [Tag, Tag, Tag]): void {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (Array.isArray(signal)) {
          consumeTag(signal[0]);
          consumeTag(signal[1]);
          consumeTag(signal[2]);
          return;
        }
      }
      consumeTag(signal);
    },
    notifySignal(signal: Tag | [Tag, Tag, Tag]): void {
      if (DEPRECATE_COMPUTED_CHAINS) {
        if (Array.isArray(signal)) {
          emberDirtyTag(signal[0]);
          emberDirtyTag(signal[1]);
          emberDirtyTag(signal[2]);
          return;
        }
      }

      emberDirtyTag(signal);
    },
    createMemo: <F>(object: object, key: string | symbol, fn: () => F): (() => F) => {
      if (DEPRECATE_COMPUTED_CHAINS) {
        const propertyTag = tagForProperty(object, key);
        const memo = createCache(fn);
        let ret: F | undefined;
        const wrappedFn = () => {
          ret = getValue(memo);
        };
        return () => {
          const tag = track(wrappedFn);
          updateTag(propertyTag, tag);
          consumeTag(tag);
          return ret!;
        };
      } else {
        const memo = createCache(fn);
        return () => getValue(memo);
      }
    },
    willSyncFlushWatchers: (): boolean => {
      //@ts-expect-error
      return !!_backburner.currentInstance && _backburner._autorun !== true;
    },
    waitFor: async <K>(promise: Promise<K>): Promise<K> => {
      if (TESTING) {
        const { waitForPromise } = importSync('@ember/test-waiters') as typeof import('@ember/test-waiters');
        return waitForPromise(promise);
      }
      return promise;
    },
  };
}
