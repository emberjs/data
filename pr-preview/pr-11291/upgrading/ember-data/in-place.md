---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/upgrading/ember-data/in-place.md
description: >-
  Replace ember-data 4.12 with the latest @warp-drive/* packages in one change,
  keeping the single store and the existing Models, adapters and serializers
  running, then convert to schemas and request builders at your own pace.
---

# Replacing ember-data in place

&#x20;  authored 2026-09-26

This guide is for apps on `ember-data` 4.12 that want to move to the latest WarpDrive in one
change, keeping the single store they have today. When you are done, nothing is converted yet:
your Models, adapters, serializers and `store.findRecord` calls keep working on the new version.
Converting them to schemas and request builders comes afterwards, one piece at a time.

Pick this path when the app can ship one change that touches every `ember-data` import. To land
the move one route at a time instead, with the old and new versions running side by side, see
[Migrating from ember-data](/upgrading/ember-data/index.md). To stay on 4.12 and adopt only the
request APIs, see [Adopting the Request APIs on 4.12](/upgrading/ember-data/incremental-adoption.md).

## Before you start

* **Be on 4.12 with its deprecations resolved.** 5.x removes everything that 4.x deprecated. Run
  the app and its tests in development and clear every `ember-data` deprecation they print;
  [deprecations.emberjs.com](https://deprecations.emberjs.com/) has a guide per ID. An app on an
  earlier release upgrades to 4.12 first.
* **Run `ember-source` 3.28.12 or later.** That is the lowest version the latest WarpDrive
  supports (see the [compatibility table](https://github.com/warp-drive-data/warp-drive/blob/main/README.md#ember-compatibility)).
* **Expect type errors if you use TypeScript.** WarpDrive 5.x ships its own types, so the
  `@types/ember-data*` packages go away in Step 1. Code that relied on the DefinitelyTyped model
  registry needs the branding described in
  [Pre-Migration](/upgrading/v5/index.md#pre-migration-update-to-native-types) of the 4.x → 5.x
  guide, from its Step 3 onward. Its Step 2, the types-only packages, is not needed here because
  you install the real packages.

## Step 1 - Swap the packages

Remove `ember-data`, any `@ember-data/*` package listed next to it, and the DefinitelyTyped
packages. Then install the five packages that make up WarpDrive for Ember. `ember-data` and
`@warp-drive/*` never share a package name, so nothing overlaps and no mirror packages are
involved.

::: code-group

```sh [pnpm]
pnpm remove ember-data @types/ember-data @types/ember-data__adapter @types/ember-data__model @types/ember-data__serializer @types/ember-data__store
pnpm add -E @warp-drive/core@latest @warp-drive/json-api@latest @warp-drive/ember@latest @warp-drive/legacy@latest @warp-drive/utilities@latest
```

```sh [npm]
npm remove ember-data @types/ember-data @types/ember-data__adapter @types/ember-data__model @types/ember-data__serializer @types/ember-data__store
npm add -E @warp-drive/core@latest @warp-drive/json-api@latest @warp-drive/ember@latest @warp-drive/legacy@latest @warp-drive/utilities@latest
```

```sh [yarn]
yarn remove ember-data @types/ember-data @types/ember-data__adapter @types/ember-data__model @types/ember-data__serializer @types/ember-data__store
yarn add -E @warp-drive/core@latest @warp-drive/json-api@latest @warp-drive/ember@latest @warp-drive/legacy@latest @warp-drive/utilities@latest
```

```sh [bun]
bun remove ember-data @types/ember-data @types/ember-data__adapter @types/ember-data__model @types/ember-data__serializer @types/ember-data__store
bun add --exact @warp-drive/core@latest @warp-drive/json-api@latest @warp-drive/ember@latest @warp-drive/legacy@latest @warp-drive/utilities@latest
```

:::

Those five are the whole install. `@warp-drive/build-config`, which the next step uses, arrives
as a dependency of `@warp-drive/core`. Two optional packages:

* `@ember-data/debug` keeps the Data pane of the Ember Inspector working. `ember-data` brought it
  along; now you install it yourself.
* `ember-inflector` stays only if your own code imports it. WarpDrive no longer reads its rules.
  Step 5 covers moving custom pluralization rules over.

## Step 2 - Configure the build

WarpDrive reads its build-time configuration from [`setConfig`](/api/@warp-drive/core/build-config/functions/setConfig). `compatWith` names the newest
version whose deprecations your app has resolved. Set it to `4.12`: every deprecation WarpDrive
introduced after 4.12 then stays supported, so the deprecated code still runs and prints its
warning instead of being stripped from the build.

```js [ember-cli-build.js]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/core/build-config'); // [!code focus]
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:8]
    // the most recent <major>.<minor> version for which
    // all deprecations have been resolved
    compatWith: '4.12',
    deprecations: {
      // ... list individual deprecations that have been resolved here
    }
  });

  return app.toTree();
};
```

`setConfig` needs no Embroider: it registers the flags through `@embroider/macros`, which classic
builds run too. For an Embroider or Vite build, use the matching form from
[Step 2](/upgrading/v5/index.md#step-2-configure-the-build) of the 4.x → 5.x guide, importing from
`@warp-drive/core/build-config` rather than the mirror package it shows.

## Step 3 - Configure reactivity

Add this side-effect import near the top of `app/app.js` or `app/app.ts`. It connects WarpDrive's
signals to Ember's tracking.

```ts [app/app.ts]
import '@warp-drive/ember/install';
```

## Step 4 - Own the store service

On 4.12 the `ember-data` package registered the `store` service for you. Now the app provides it.
Create `app/services/store.js` or `app/services/store.ts`:

```ts [app/services/store.ts]
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  schemas: [
    // schemas for anything migrated off of Model, none yet
  ],
  handlers: [
    // your additional handlers, if any; Fetch, LegacyNetworkHandler
    // and CacheHandler are provided automatically
  ],
});
```

This is the store `ember-data` configured for you, spelled out:

* `legacyRequests: true` keeps every request method the app calls today, `findRecord`, `findAll`,
  `query`, `queryRecord`, `save`, `deleteRecord`, `adapterFor`, `serializerFor`, `pushPayload`,
  `normalize` and `serializeRecord`, and sets up the request pipeline they need.
* `linksMode: false` keeps relationships loading through adapters and serializers. It has to stay
  off while `legacyRequests` is on.
* `cache: JSONAPICache` is the same cache 4.12 used internally.
* `schemas` fills up as Models convert. Until then, each Model is its own schema.

If the app already has an `app/services/store.js`, because it extended `ember-data/store` to add
request handlers as [Adopting the Request APIs on 4.12](/upgrading/ember-data/incremental-adoption.md)
describes, keep its members and change what it extends. [`useLegacyStore`](/api/@warp-drive/legacy/functions/useLegacyStore) returns a class, so:

```ts [app/services/store.ts]
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

const AppStore = useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  cache: JSONAPICache,
  schemas: [],
  handlers: [
    // move the handlers you registered in the constructor here
  ],
});

export default class Store extends AppStore {
  // your members
}
```

Drop the constructor that built a [`RequestManager`](/api/@warp-drive/core/classes/RequestManager) by hand. `useLegacyStore` builds it, and the
`handlers` option is where your own handlers go.

## Step 5 - Rewrite the imports

Every module that came from `ember-data` now has a home in `@warp-drive/*`. Two things changed
besides the module names: `Model` keeps its default export, but the adapter, serializer and
transform base classes are named exports in 5.x, and the store, request manager and [`Fetch`](/api/@warp-drive/core/variables/Fetch)
handler all live in `@warp-drive/core`.

| On 4.12 | On 5.x |
| --- | --- |
| `import Model, { attr, belongsTo, hasMany } from '@ember-data/model'` | `import Model, { attr, belongsTo, hasMany } from '@warp-drive/legacy/model'` |
| `import Adapter from '@ember-data/adapter'` | `import { Adapter } from '@warp-drive/legacy/adapter'` |
| `import JSONAPIAdapter from '@ember-data/adapter/json-api'` | `import { JSONAPIAdapter } from '@warp-drive/legacy/adapter/json-api'` |
| `import RESTAdapter from '@ember-data/adapter/rest'` | `import { RESTAdapter } from '@warp-drive/legacy/adapter/rest'` |
| `import AdapterError, { InvalidError } from '@ember-data/adapter/error'` | `import { AdapterError, InvalidError } from '@warp-drive/legacy/adapter/error'` |
| `import Serializer from '@ember-data/serializer'` | `import { Serializer } from '@warp-drive/legacy/serializer'` |
| `import JSONAPISerializer from '@ember-data/serializer/json-api'` | `import { JSONAPISerializer } from '@warp-drive/legacy/serializer/json-api'` |
| `import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest'` | `import { RESTSerializer, EmbeddedRecordsMixin } from '@warp-drive/legacy/serializer/rest'` |
| `import JSONSerializer from '@ember-data/serializer/json'` | `import { JSONSerializer } from '@warp-drive/legacy/serializer/json'` |
| `import Transform from '@ember-data/serializer/transform'` | `import { Transform } from '@warp-drive/legacy/serializer/transform'` |
| `import Store, { CacheHandler } from '@ember-data/store'` | `import { Store, CacheHandler } from '@warp-drive/core'` |
| `import RequestManager from '@ember-data/request'` | `import { RequestManager } from '@warp-drive/core'` |
| `import Fetch from '@ember-data/request/fetch'` | `import { Fetch } from '@warp-drive/core'` |
| `import { LegacyNetworkHandler } from '@ember-data/legacy-compat'` | `import { LegacyNetworkHandler } from '@warp-drive/legacy/compat'` |
| `import Store from 'ember-data/store'` | your own `app/services/store` from Step 4 |
| `import { pluralize } from 'ember-inflector'` | `import { pluralize } from '@warp-drive/utilities/string'` |

Let the linter do the bulk of it. Install
[`eslint-plugin-warp-drive`](/guides/linting/index.md), enable its `no-legacy-imports` rule, and
run ESLint with `--fix`. The rule rewrites the module paths and turns the default imports above
into the named ones, which covers every row of the table except the last two:

* It reports `ember-data/store` as still living in a legacy package and leaves the import as
  written. Import your service from Step 4 instead.
* It leaves `ember-inflector` alone, since it is not an `ember-data` package. Import `pluralize`
  and `singularize` from `@warp-drive/utilities/string` instead. Custom rules move too: register
  them once, before the first request, with `irregular('person', 'people')`, `uncountable('sheep')`,
  `plural(regex, replacement)` and `singular(regex, replacement)` from the same module. WarpDrive
  does not read rules registered with `ember-inflector`.

Generators keep working. `ember g model`, `adapter`, `serializer` and `transform` now come from
`@warp-drive/legacy` and write the 5.x imports.

## Step 6 - Run the app and the tests

The runtime surface is the one you had. Models, adapters, serializers and the store's request
methods are deprecated in 5.x but still work, which is what `compatWith: '4.12'` guarantees.
What you should see is new deprecation output, one warning per 5.x deprecation the app trips.
Leave those for now; the next section is where they get resolved.

Tests need no new setup. Anything that imported `ember-data/store` or an `@ember-data/*` module
was rewritten in Step 5, and the test helpers from `ember-qunit` resolve the store service the
same way they did before.

## After the move

You are on the latest WarpDrive with a legacy-shaped app. From here each step is independent and
can ship on its own:

* **Resolve the 5.x deprecations** the app prints, one flag at a time, and record each in the
  `deprecations` block of Step 2 or by raising `compatWith`. The
  [Deprecations API docs](/api/@warp-drive/core/build-config/deprecations/) list every flag.
* **Convert Models to schemas** with the [`migrate-to-schema` codemod](/upgrading/v5/codemods.md#migrate-to-schema),
  adding its output to the `schemas` option. [Step 5](/upgrading/v5/index.md#step-5-convert-profit)
  of the 4.x → 5.x guide walks through what it generates.
* **Move requests to builders** with the [`legacy-compat-builders` codemod](/upgrading/v5/codemods.md#legacy-compat-builders).
  They still go through your adapters and serializers, so nothing changes on the wire.
* **Turn off what is left.** Once no adapter or serializer is used, set `linksMode: true` and drop
  `legacyRequests`, or move to [`useRecommendedStore`](/api/@warp-drive/core/functions/useRecommendedStore) from `@warp-drive/core`. See the
  [useLegacyStore](/api/@warp-drive/legacy/functions/useLegacyStore) options for the store
  shapes in between.
