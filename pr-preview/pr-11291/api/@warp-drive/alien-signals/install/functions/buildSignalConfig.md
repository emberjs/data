---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/alien-signals/install/functions/buildSignalConfig.md
description: >-
  Builds the signal hooks that back WarpDrive reactivity with signals and memos
  built on alien-signals, and that other signals implementations register with.
---

# &#x20;buildSignalConfig()&#x20;

```ts
function buildSignalConfig(options: HooksOptions): ComposingSignalHooks;
```

Defined in: [install.ts:171](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/install.ts#L171)

Builds the [SignalHooks](../../../core/configure/types/SignalHooks.md) that back ***Warp*Drive**'s reactivity with the graph in
[`@warp-drive/alien-signals/primitives`](/api/@warp-drive/alien-signals/primitives/). Each
signal is a value-less `SignalNode`, so every notification counts as a change, and each memo is
a `MemoNode`.

The hooks include a `register` hook that adds a [SignalIntegration](../types/SignalIntegration.md) to them, which is how
other frameworks' `install` entry points add their signals after this one. With nothing
registered, `willSyncFlushWatchers` returns `false` and `waitFor` returns the promise it is
given.

Importing `@warp-drive/alien-signals/install` already passes this function to
[setupSignals](../../../core/configure/functions/setupSignals.md).

## Parameters

### options

[`HooksOptions`](../../../core/configure/types/HooksOptions.md)

the [HooksOptions](../../../core/configure/types/HooksOptions.md) that `setupSignals` passes in, passed on to each registered integration

## Returns

[`ComposingSignalHooks`](../types/ComposingSignalHooks.md)

the signal hooks backed by the alien-signals graph

## Example

```ts
// what importing '@warp-drive/alien-signals/install' does
import { setupSignals } from '@warp-drive/core/configure';
import { buildSignalConfig } from '@warp-drive/alien-signals/install';

setupSignals(buildSignalConfig);
```
