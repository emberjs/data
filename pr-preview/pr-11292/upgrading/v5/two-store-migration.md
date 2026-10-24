---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/upgrading/v5/two-store-migration.md
description: >-
  Run a second WarpDrive store built from the -mirror packages beside your
  existing 4.x store so parts of an app can adopt 5.x incrementally, with the
  tradeoffs to expect.
---

# Migrating Between Versions Using The Two Store Approach

&#x20;  authored 2023-06-10

Sometimes apps build over features, private APIs 🙈, or 3rd party libraries that later become deprecated and removed.

Most deprecations are relatively easy to resolve, but sometimes APIs change that had been central to the way an app was built. A good example of a difficult to resolve change is the switch away from per-record caching internally, which should have been transparent to apps but left users of a popular 3rd party library (ModelFragments) stuck on the 4.6 release.

An example of such a shift in public APIs is the move away from Ember's ArrayLike interface for collections of records and away from promise-proxy wrappers surrounding async relationships. While lots of new patterns exist to replace those APIs, users that made heavy use of these features have a harder time migrating from version 4 to version 5, and thus stop being able to adopt new features in newer parts of their application until a substantial cleanup has occurred.

This is where the two-store-approach can be useful. In the two-store approach, an application configures a second store service under a different service name (for instance `v2-store`) enabling some portions of the app to use modern features without immediately being required to upgrade all of the existing application code to match.

Any application can configure more than one store using whatever version of WarpDrive is installed, but to maximize this approach it is useful to be able to have the second store also use a more recent version of the library.

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

All mirror packages are also versions which ship their own types. To use those types, configure your `tsconfig.json` to be able to find them [as shown here](/guides/the-manual/typescript/configuration.md#using-native-types), adding the appropriate `-mirror` appendage to each package name (PS: you can have distinct types for both your older and your newer version!).

## Caveat Emptor

Utilizing the two-store approach has a few tradeoffs:

1. If you want compatible type signatures for use by your components, you should upgrade your app to make use of native types first, likely using the [types-package approach](/guides/the-manual/typescript/installation.md#using-types-packages).

In fact, it is likely that if you want TypeScript for the v2 store that you are *forced* to remove the `@types/ember*` packages from your project entirely and upgrade to using native types for ember-source and ember-data. This is because the native types for WarpDrive depend on ember's native types.

2. You should not use both `ember-data` and `ember-data-mirror` or there will be an unresolveable race condition for which one is the `store` service. Instead one of the stores, usually the mirror, MUST import and fully configure the store. The [4.x → 5.x guide](./index.md#step-4-configure-the-store) does this with `useLegacyStore`, which reproduces the store that `ember-data` configured "by default" historically. Its options let you drop pieces of that default you no longer want, such as adapters and serializers, or Model itself.

3. Due to (#2) above, your build MUST call `setConfig` from the mirror package so the mirror gets its own build config. See [Configure The Build](./index.md#step-2-configure-the-build) in the 4.x → 5.x guide.

4. Record instances created by one store may not be used by another store, this primarily means they cannot be set as values of relationships. The records (and data) of each store is a wholly distinct context. You may find [ember-provide-consume-context](https://github.com/customerio/ember-provide-consume-context) useful for helping to manage this. Migrating "leaf first" or well-encapsulated parts of your app will generally lead to the pit-of-success.
