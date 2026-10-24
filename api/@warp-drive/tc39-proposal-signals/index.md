---
url: https://canary.warp-drive.io/api/@warp-drive/tc39-proposal-signals.md
description: >-
  Configures WarpDrive reactivity to use the TC39 Signals polyfill
  (signal-polyfill); import its install entry in apps that use TC39 Signals.
---

Reactivity for ***Warp*Drive** built on the prototype
[TC39 Signals polyfill](https://github.com/proposal-signals/signal-polyfill). Its single entry
point, [`install`](/api/@warp-drive/tc39-proposal-signals/install/), configures ***Warp*Drive** to
back its signals with the polyfill's `Signal.State` and its memos with `Signal.Computed`. Import it
once at the top of your application:

```ts
import '@warp-drive/tc39-proposal-signals/install';
```

## Guides

* [Installation](/guides/installation/#tc39-signals): install
  `@warp-drive/tc39-proposal-signals` and add the `@warp-drive/tc39-proposal-signals/install`
  import to your app and test setup.
* [Setup](/guides/configuration/): configure the build plugin and create a Store.
* [Reactivity](/guides/the-manual/reactivity/): how ***Warp*Drive** uses signals, and the hooks
  that let it use any signals implementation.
