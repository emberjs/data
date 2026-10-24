---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/ember/install.md
description: >-
  The `buildSignalConfig` function, which creates the signal hooks that wire
  WarpDrive reactivity into Ember autotracking using `@glimmer/validator` tags.
---

Importing this entry point configures ***Warp*Drive** to use Ember's autotracking for
reactivity: on import it calls `setupSignals(buildSignalConfig)` from
`@warp-drive/core/configure`.

Add the import to the top of your application and your test setup:

```ts
import '@warp-drive/ember/install';
```

An addon should do this only in its tests, not in its published code. See
[Installation](/guides/installation/#ember) for the full Ember setup.

## Functions

* [buildSignalConfig](functions/buildSignalConfig.md)
