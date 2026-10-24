---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/build-config/deprecations.md
---

# Deprecations

This guide is intended to help you understand both how to address an active
deprecation and how to eliminate the code that supports the deprecation once
it has been resolved.

Eliminating the associated code reduces the size of your application, often opts
applications into more performant fast-paths, and ensures your application does
not revert to using the deprecated behavior in the future.

## Active Deprecation IDs

* [ember-data:deprecate-non-strict-types](variables/DEPRECATE_NON_STRICT_TYPES.md)
* [ember-data:deprecate-non-strict-id](variables/DEPRECATE_NON_STRICT_ID.md)
* [ember-data:deprecate-legacy-imports](variables/DEPRECATE_LEGACY_IMPORTS.md)
* [ember-data:deprecate-non-unique-collection-payloads](variables/DEPRECATE_NON_UNIQUE_PAYLOADS.md)
* [ember-data:deprecate-relationship-remote-update-clearing-local-state](variables/DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE.md)
* [ember-data:deprecate-many-array-duplicates](variables/DEPRECATE_MANY_ARRAY_DUPLICATES.md)
* [ember-data:deprecate-store-extends-ember-object](variables/DEPRECATE_STORE_EXTENDS_EMBER_OBJECT.md)
* [ember-data:schema-service-updates](variables/ENABLE_LEGACY_SCHEMA_SERVICE.md)
* [warp-drive.ember-inflector](variables/DEPRECATE_EMBER_INFLECTOR.md)
* [warp-drive:deprecate-tracking-package](variables/DEPRECATE_TRACKING_PACKAGE.md)

## Removing Code for Deprecated Features

***Warp*Drive** enables applications to opt-in to fully eliminating the code
for a deprecated feature once the application has taken the necessary steps to
ensure that it no longer requires the use of the code which triggers the deprecation.

Each deprecation ID is associated to a deprecation flag which is used to instrument
the library for build-time removal of the deprecated code. Some flags have multiple
deprecation IDs associated to them, in which case to remove the deprecated code all
of the deprecation IDs must be resolved.

There are two modes for opting into deprecated code removal:

* by version
* by deprecation flag

If your app has resolved all deprecations present in a given version,
you may specify that version as your "compatWith" version. This will
remove the code for all deprecations that were introduced in or before
that version.

::: code-group

```ts [ember-cli-build.js]
setConfig(app, __dirname, {
  compatWith: '5.0', // [!code highlight]
});
```

```ts [babel.config.mjs]
setConfig(context, {
  compatWith: '5.0', // [!code highlight]
});
```

:::

For instance, if a deprecation was introduced in 5.3, and the app specifies
5.2 as its minimum version compatibility, any deprecations introduced in or
before 5.2 will be removed, but any deprecations introduced in 5.3 will remain.

You may also specify that specific deprecations are resolved. These approaches
may be used together.

::: code-group

```ts [ember-cli-build.js]
setConfig(app, __dirname, {
 deprecations: {
   DEPRECATE_NON_STRICT_TYPES: false, // [!code highlight]
   DEPRECATE_NON_STRICT_ID: false, // [!code highlight]
 }
});
```

```ts [babel.config.mjs]
setConfig(context, {
  deprecations: {
    DEPRECATE_NON_STRICT_TYPES: false, // [!code highlight]
    DEPRECATE_NON_STRICT_ID: false, // [!code highlight]
  }
});
```

:::

::: info 💡 Report Bugs if You Find Them
***Warp*Drive** does not test against permutations of deprecations
being stripped, our tests run against "all deprecated code included"
and "all deprecated code removed". Unspecified behavior may sometimes
occur when removing code for only specific deprecations.

If this happens, we'd like to know 💜
:::

## Variables

* [DEPRECATE\_COMPUTED\_CHAINS](variables/DEPRECATE_COMPUTED_CHAINS.md)
* [DEPRECATE\_EMBER\_INFLECTOR](variables/DEPRECATE_EMBER_INFLECTOR.md)
* [DEPRECATE\_LEGACY\_IMPORTS](variables/DEPRECATE_LEGACY_IMPORTS.md)
* [DEPRECATE\_MANY\_ARRAY\_DUPLICATES](variables/DEPRECATE_MANY_ARRAY_DUPLICATES.md)
* [DEPRECATE\_NON\_STRICT\_ID](variables/DEPRECATE_NON_STRICT_ID.md)
* [DEPRECATE\_NON\_STRICT\_TYPES](variables/DEPRECATE_NON_STRICT_TYPES.md)
* [DEPRECATE\_NON\_UNIQUE\_PAYLOADS](variables/DEPRECATE_NON_UNIQUE_PAYLOADS.md)
* [DEPRECATE\_RELATIONSHIP\_REMOTE\_UPDATE\_CLEARING\_LOCAL\_STATE](variables/DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE.md)
* [DEPRECATE\_STORE\_EXTENDS\_EMBER\_OBJECT](variables/DEPRECATE_STORE_EXTENDS_EMBER_OBJECT.md)
* [DEPRECATE\_TRACKING\_PACKAGE](variables/DEPRECATE_TRACKING_PACKAGE.md)
* [DISABLE\_7X\_DEPRECATIONS](variables/DISABLE_7X_DEPRECATIONS.md)
* [ENABLE\_LEGACY\_REQUEST\_METHODS](variables/ENABLE_LEGACY_REQUEST_METHODS.md)
* [ENABLE\_LEGACY\_SCHEMA\_SERVICE](variables/ENABLE_LEGACY_SCHEMA_SERVICE.md)
