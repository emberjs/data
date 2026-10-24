---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/ember/install.md
description: >-
  The `buildSignalConfig` function, which creates the signal hooks that wire
  WarpDrive reactivity into Ember autotracking using `@glimmer/validator` tags.
---

Importing this entry point configures ***Warp*Drive** to use Ember's autotracking for
reactivity: on import it calls `registerSignals(buildSignalConfig)` from
`@warp-drive/core/configure`.

If `@warp-drive/alien-signals/install` was imported first, Ember's tags are registered with its
signals graph, alongside any other framework's signals, so that one store re-renders both
Ember components and those of other frameworks on the page. Memos then come from that graph
instead of Ember's `createCache`, which still updates Ember for every signal a memo reads.
Otherwise, Ember's autotracking is configured on its own.

Add the import to the top of your application and your test setup:

```ts
import '@warp-drive/ember/install';
```

An addon should do this only in its tests, not in its published code. See
[Installation](/guides/installation/#ember) for the full Ember setup.

## Functions

* [buildSignalConfig](functions/buildSignalConfig.md)
