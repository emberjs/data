---
url: >-
  https://canary.warp-drive.io/guides/the-manual/cookbook/multiple-frameworks-on-one-page.md
description: >-
  Import @warp-drive/alien-signals/install before the Ember and React install
  entry points so one WarpDrive store re-renders both Ember and React components
  on the same page.
---

# Using Ember and React on the Same Page

## In This Guide

***Warp*Drive** doesn't wrap your data in any one framework's signals. Instead, it calls a set of
[SignalHooks](/api/@warp-drive/core/configure/types/SignalHooks) whenever data is read or
changes, and each framework's `install` entry point provides the hooks for that framework. Ember
only re-renders for Ember's tags, and React only re-renders for the signals its watchers subscribe
to. So when both frameworks render the same data, both need to hear about every read and every
change.

[`@warp-drive/alien-signals`](/api/@warp-drive/alien-signals/) does this for you. Its `install`
entry point configures a signals graph that other frameworks add their signals to, instead of
replacing it. This guide installs it alongside Ember and React, so that one store re-renders
components in both frameworks.

* [Before You Start](#before-you-start)
* [Install the Signals](#install-the-signals)
* [How the Frameworks Share Signals](#how-the-frameworks-share-signals)
* [Share the Store](#share-the-store)
* [Other Frameworks](#other-frameworks)

## Before You Start

This guide assumes an Ember app that also renders React components, with both
`@warp-drive/ember` and `@warp-drive/react` installed as described in
[Installation](/guides/installation/index.md). You don't need
[PolarisMode](/guides/the-manual/schemas/resources/polaris-mode.md) for this; see
[Do I need PolarisMode to share state between Ember and React on the same page?](/guides/faq/polaris-mode-with-ember-and-react.md).

Add `@warp-drive/alien-signals` to your app, pinned to the same version as your other
***Warp*Drive** packages. `@warp-drive/react` already depends on it, but your app imports it
directly, so it needs to be one of your app's own dependencies too.

```sh
pnpm add -E @warp-drive/alien-signals
```

## Install the Signals

Import `@warp-drive/alien-signals/install` at the top of your app's entry point and your test
setup, before the Ember and React `install` imports:

::: code-group

```ts [app/app.ts]
import '@warp-drive/alien-signals/install';
import '@warp-drive/ember/install';
import '@warp-drive/react/install';
```

```ts [tests/test-helper.ts]
import '@warp-drive/alien-signals/install';
import '@warp-drive/ember/install';
import '@warp-drive/react/install';
```

:::

The order matters for Ember. On its own, `@warp-drive/ember/install` configures Ember's
autotracking as ***Warp*Drive**'s only signals implementation. When
`@warp-drive/alien-signals/install` has already run, Ember registers its tags with the
alien-signals graph instead. Importing `@warp-drive/alien-signals/install` after
`@warp-drive/ember/install` throws an error that says so.

`@warp-drive/react/install` imports `@warp-drive/alien-signals/install` itself, so React works in
either position. Listing alien-signals first anyway keeps the rule simple: it always comes first.

:::tip Already composing signal hooks yourself?
If your app combines each framework's `buildSignalConfig` in its own `setupSignals` call, so that
`createSignal` returns one signal per framework, you no longer need it. Delete that call, and
replace the import of the module it lives in with the three imports above.
:::

## How the Frameworks Share Signals

You don't need any of this to use the setup above, but it explains why it works.

* **Signals.** Each time ***Warp*Drive** creates a signal, the alien-signals graph creates an
  Ember tag to go with it. Reading or changing the data consumes or dirties both, so Ember's
  autotracking and the graph each see every read and change.
* **React.** React's integration watches the graph directly. A signal read while a component
  renders inside a [`ReactiveContext`](/api/@warp-drive/react/functions/ReactiveContext) is added
  to that context's watcher.
* **Memos.** Values ***Warp*Drive** memoizes, such as
  [derived fields](/guides/the-manual/schemas/derivations.md) and some request and pagination
  state, are memos in the alien-signals graph; neither framework creates its own. A React
  component watches the memo itself, so it re-renders whenever anything the memo depends on
  changes. Ember sees each memo as one more tag: reading the memo consumes it, whether the memo
  runs or returns a cached value, and the graph dirties it as soon as anything the memo depends on
  changes. Memoized values update in both frameworks, whichever one read them first.
* **Test waiters.** Each framework's `waitFor` hook still runs, so `await settled()` from
  `@ember/test-helpers` waits for ***Warp*Drive**'s requests in your Ember tests.

Two behaviors differ from an Ember app that only imports `@warp-drive/ember/install`:

* A memo only recomputes when a signal managed by ***Warp*Drive** changes. If a
  [derived field](/guides/the-manual/schemas/derivations.md) reads state that only a framework
  tracks, such as an Ember `@tracked` property or a React `useState` value, the memo keeps
  returning its cached value when that state changes. Keep the state a derivation reads in
  ***Warp*Drive**, for instance as a field on the resource it derives from.
* With the `DEPRECATE_COMPUTED_CHAINS` deprecation active, a classic computed property that
  depends on a memoized key may not recompute when that memo changes.

## Share the Store

Both frameworks need to render from the same store instance, not two stores built from the same
class. Create it the usual way for Ember, then hand that instance to React's
[`StoreProvider`](/api/@warp-drive/react/functions/StoreProvider) with its `store` prop, as
[Setup - React](/guides/configuration/react.md) describes.

```tsx
<StoreProvider store={store}>
  <UserList />
</StoreProvider>
```

## Other Frameworks

The same setup works for other frameworks: import `@warp-drive/alien-signals/install` first, then
each framework's `install` entry point. An `install` entry point that calls
[`registerSignals`](/api/@warp-drive/core/configure/functions/registerSignals), as
`@warp-drive/ember/install` and `@warp-drive/tc39-proposal-signals/install` do, registers with the
graph when alien-signals is installed, and configures that framework on its own when it isn't.

To add a framework that doesn't have a ***Warp*Drive** package yet, pass its hooks to
[`registerSignalIntegration`](/api/@warp-drive/alien-signals/install/functions/registerSignalIntegration).
[SignalIntegration](/api/@warp-drive/alien-signals/install/types/SignalIntegration) describes the
two shapes an integration can take: one that brings its own signals, like Ember, and one that
observes the graph's signals and memos, like React.
