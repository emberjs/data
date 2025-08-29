# Migrating Between Versions Using The Two Store Approach

Sometimes apps build over features, private APIs 🙈, or 3rd party libraries that later become deprecated and removed.

Most deprecations are relatively easy to resolve, but sometimes APIs change that had been central to the way an app was built. A good example of a difficult to resolve change is the switch away from per-record caching internally, which should have been transparent to apps but left users of a popular 3rd party libary (ModelFragments) stuck on the 4.6 release.

An example of such a shift in public APIs is the move away from Ember's ArrayLike interface for collections of records and away from promise-proxy wrappers surrounding async relationships. While lots of new patterns exist to replace those APIs, users that made heavy use of these features have a harder time migrating from version 4 to version 5, and thus stop being able to adopt new features in newer parts of their application until a substantial cleanup has occurred.

This is where the two-store-approach can be useful. In the two-store approach, an application configures a second store service under a different service name (for instance `v2-store`) enabling some portions of the app to use modern features without immediately being required to upgrade all of the existing application code to match.

Any application can configure more than one store using whatever version of EmberData/WarpDrive is installed, but to maximize this approach it is useful to be able to have the second store also use a more recent version of the library.

This is why we publish **"mirror"** versions of every package.

## Mirror Versions

Every package we publish has a **"mirror"** package equivalent.

For packages that have an org name (e.g. `@ember-data/store` or `@warp-drive/ember`) we add `-mirror` to the org name. E.g. `@ember-data/store` has the mirror `@ember-data-mirror/store`. For packages without an org we add `-mirror` to the name e.g. `ember-data` has the mirror `ember-data-mirror`.

Mirror packages are configured to work with other mirror packages as a wholly distinct package ecosystem.

For instance, the mirror of `@ember-data/model` is `@ember-data-mirror/model` and instead of having a peer-dependency on `@ember-data/store` it has a peer-dependency on `@ember-data-mirror/store`.

When importing code, you import from the mirror path e.g. `import Model, { attr } from '@ember-data-mirror/model';`.

For convenience, some types, constants and symbols that are safe to interop between versions will do so if you have both mirror and non-mirror versions available.

Mirror packages are available for versions `^4.13.0 | >=5.3.8`.

## TypeScript

All mirror packages are also versions which ship their own types. To use those types, configure your `tsconfig.json` to be able to find them [as shown here](../typescript/1-configuration.md#using-native-types), adding the appropriate `-mirror` appendage to each package name (PS: you can have distinct types for both your older and your newer version!).

## Caveat Umptor

Utilizing the two-store approach has a few tradeoffs:

1. If you want compatible type signatures for use by your components, you should upgrade your app to make use of native types first, likely using the [types-package approach](../typescript/0-installation.md#using-types-packages).

In fact, it is likely that if you want typescript for the v2 store that you are *forced* to remove the `@types/ember*` packages from your project entirely and upgrade to using native types for ember-source and ember-data. This is because the native types for EmberData/WarpDrive depend on ember's native types.

2. You should not use both `ember-data` and `ember-data-mirror` or there will be an unresolveable race condition for which one is the `store` service. Instead one of the stores, usually the mirror, MUST import and fully configure the store. E.g.

```ts
import Store from '@ember-data-mirror/store';

export default class V2Store extends Store {
  // ... config here
}
```

Configuring the store generally means you need to do *at least* four things:

- setup the hooks for presentation (instantiateRecord/teardownRecord)
- setup the schema source
- setup and configure the request-manager
  - *optionally* configure a cache policy
- setup the cache

We recommend the source-code for [ember-data/store](https://github.com/emberjs/data/blob/main/packages/-ember-data/src/store.ts) if you are curious what the configuration used "by default" historically looks like. If you wanted to exactly match the behaviors of your existing store (but perhaps without deprecated features) this is what would be required. However, if taking the two-store approach it is likely you want to use a different configuration.

For instance:

- perhaps you want to fully drop support for adapters and serializers
- perhaps you want to drop support for Model and only use ReactiveResource (or use some of both to give yourself some flexibility)

3. Due to (#2) above, your ember-cli-build file MUST call `setConfig` to configure the build config for the library.

```ts
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive-mirror/build-config');

  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, {
    // settings here if desired
  });

  return app.toTree();
}
```

4. Record instances created by one store may not be used by another store, this primarily means they cannot be set as values of relationships. The records (and data) of each store is a wholly distinct context. You may find [ember-provide-consume-context](https://github.com/customerio/ember-provide-consume-context) useful for helping to manage this. Migrating "leaf first" or well-encapsulated parts of your app will generally lead to the pit-of-success.


