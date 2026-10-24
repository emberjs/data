---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/tc39-proposal-signals/install.md
description: >-
  Side-effect import that configures WarpDrive to use the TC39 Signals polyfill,
  `signal-polyfill`, for reactivity.
---

Importing this entry point configures ***Warp*Drive** to use the
[TC39 Signals polyfill](https://github.com/proposal-signals/signal-polyfill) for reactivity:
on import it calls `registerSignals` with [buildSignalConfig](functions/buildSignalConfig.md).

If `@warp-drive/alien-signals/install` was imported first, each `Signal.State` is registered with
its signals graph, alongside any other framework's signals, and memos come from that graph.
Otherwise it configures the polyfill on its own with `setupSignals`.

Add the import to the top of your application. If you have tests which do not invoke your
app, add it to your test setup as well:

```ts
import '@warp-drive/tc39-proposal-signals/install';
```

A library should do this only in its tests, not in its published code. See
[Installation](/guides/installation/#tc39-signals) for the full setup.

## Functions

* [buildSignalConfig](functions/buildSignalConfig.md)
