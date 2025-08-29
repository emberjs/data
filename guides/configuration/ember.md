---
order: 1
title: Additional Setup for Ember
---

:::warning caution
Older legacy features of WarpDrive (inherited from when the library was named EmberData) should only be used with Ember.
:::

# Additional Setup for Ember

## Configuring TypeScript

TypeScript will automatically discover the types these packages provide. If you're using `ember-source`, you should also configure and use Ember's native types. If you
previously had any [DefinitelyTyped (@types)](https://github.com/DefinitelyTyped/DefinitelyTyped) packages installed for ember or ember-data you should remove those.

If you have any references to ember-data or warp-drive types or types packages in package.json or tsconfig.json you can remove those.

## What is "Legacy"

You've probably heard old code patterns referred to as "legacy code" before. In WarpDrive, Legacy refers to older features to which we are giving a second, extended life. When features are deprecated in `@warp-drive/core`, they are added to `@warp-drive/legacy` in a way that allows apps to opt-in to bring them back.

Legacy features will not live forever, but they will receive a second deprecation cycle before being deleted. There is no set schedule to when code in legacy might
be deprecated. Sometimes it may become deprecated immediately after the feature is
removed from core, other times it may last for several majors. Occasionally a deprecation in core won't be able to be restored from legacy at all. It all depends on how easy the feature is to maintain support for weighed against the community and maintenance costs of keeping it around.

For example, if Ember were to deprecated EmberObject, then maintaining support for
Model, Adapter and Serializer would become untenable quickly - so we would opt to
simultaneously deprecate these from legacy.

The `@warp-drive/legacy` package is opt-in. New apps should not use it, existing apps
should work to remove the features it provides. Consider it your cleanup checklist.

## Restoring EmberObject Features

- use per-trait or per-resource or per-field extension

## Restoring Ember ArrayLike Features

- use per-field extension

## Adapter/Serializer and Legacy Request Methods

You should configure support for legacy requests if your application still makes requests which use an Adapter or Serializer.

Some example APIs you may still be using that are reasons to configure this legacy support include:

- You have async relationships that don't yet have links
- You have sync relationships that you load via references that don't yet have links
- You still use methods on the store to fetch data other than `store.request`
- You still fetch data with the Legacy builders
- You still use `model.save` or `model.destroyRecord`

You may also find you want to use Legacy Requests if you are creating a new application and [LinksMode](../the-manual/misc/links-mode.md) is not sufficient

- add the LegacyNetworkHandler
- add the Legacy Request APIs back
- add the adapterFor, serializerFor, modelFor, pushPayload, and normalize hooks back
- caveat: serialization/normalization of newer field schemas

## Model

- custom extensions

## ModelFragments

## Other

- resetOnRemote
- filterDuplicates

