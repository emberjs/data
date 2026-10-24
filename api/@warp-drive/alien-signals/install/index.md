---
url: https://canary.warp-drive.io/api/@warp-drive/alien-signals/install.md
description: >-
  Side-effect import that configures WarpDrive to use a signals graph built on
  alien-signals for reactivity, which other frameworks' signals register with.
---

Importing this entry point configures ***Warp*Drive** to use a signals graph built on
[alien-signals](https://github.com/stackblitz/alien-signals) for reactivity: on import it calls
[setupSignals](../../core/configure/functions/setupSignals.md) with [buildSignalConfig](functions/buildSignalConfig.md).

Add the import to the top of your application, before any other `install` import. If you have
tests which do not invoke your app, add it to your test setup as well:

```ts
import '@warp-drive/alien-signals/install';
```

The graph it configures composes other signals implementations into its own. A framework's
`install` entry point imported after this one, such as `@warp-drive/ember/install`, adds that
framework's signals to the graph instead of replacing it, so one store re-renders components
in every framework on the page. Importing this entry point after another framework's `install`
throws, since that framework's hooks are already configured by then.

Memos, such as the ones behind derived fields, always come from this graph, so they only
recompute when a signal ***Warp*Drive** manages changes. A memo that reads state only a
framework tracks, such as an Ember `@tracked` property, keeps returning its cached value when
that state changes.

A library should do this only in its tests, not in its published code. To observe changes
from outside ***Warp*Drive**, use the `Watcher` from
[`@warp-drive/alien-signals/primitives`](/api/@warp-drive/alien-signals/primitives/).

## Functions

* [buildSignalConfig](functions/buildSignalConfig.md)
* [registerSignalIntegration](functions/registerSignalIntegration.md)

## Types

* [ComposingSignalHooks](types/ComposingSignalHooks.md)
* [SignalIntegration](types/SignalIntegration.md)
