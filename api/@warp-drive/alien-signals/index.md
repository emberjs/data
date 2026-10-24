---
url: https://canary.warp-drive.io/api/@warp-drive/alien-signals.md
description: >-
  Configures WarpDrive reactivity to use a signals graph built on alien-signals;
  import its install entry in apps, or build a framework integration on its
  primitives.
---

Reactivity for ***Warp*Drive** built on [alien-signals](https://github.com/stackblitz/alien-signals),
the push-pull signals algorithm that also powers Vue 3.6's reactivity. It has two entry points:

* [`install`](/api/@warp-drive/alien-signals/install/) configures ***Warp*Drive** to back its
  signals and memos with this package's graph. Import it once at the top of your application:

  ```ts
  import '@warp-drive/alien-signals/install';
  ```

  Other frameworks' `install` entry points imported after it, such as `@warp-drive/ember/install`,
  register their signals with the same graph instead of replacing it, so one store re-renders
  components in every framework on the page. Memoized values such as
  [derived fields](/guides/the-manual/schemas/derivations.md) then only recompute when a signal
  ***Warp*Drive** manages changes, not when state that only a framework tracks, such as an Ember
  `@tracked` property, changes.

* [`primitives`](/api/@warp-drive/alien-signals/primitives/) exports the graph itself: signals,
  memos, and a `Watcher` that a framework integration uses to learn when the data it rendered
  changed. `@warp-drive/react` is built on it.

The graph implements what ***Warp*Drive**'s signal hooks need rather than the full
[TC39 Signals](https://github.com/tc39/proposal-signals) API. If your app already uses the TC39
Signals polyfill, use [`@warp-drive/tc39-proposal-signals`](/api/@warp-drive/tc39-proposal-signals/)
instead.

## Guides

* [Setup](/guides/configuration/): configure the build plugin and create a Store.
* [Reactivity](/guides/the-manual/reactivity/): how ***Warp*Drive** uses signals, and the hooks
  that let it use any signals implementation.
* [Using Ember and React on the Same Page](/guides/the-manual/cookbook/multiple-frameworks-on-one-page.md):
  share one store between frameworks by registering them with this package's graph.
