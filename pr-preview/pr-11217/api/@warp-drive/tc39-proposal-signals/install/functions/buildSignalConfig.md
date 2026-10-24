---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/tc39-proposal-signals/install/functions/buildSignalConfig.md
description: >-
  Builds the signal hooks that back WarpDrive reactivity with `Signal.State` and
  `Signal.Computed` from the TC39 Signals polyfill.
---

# &#x20;buildSignalConfig()&#x20;

```ts
function buildSignalConfig(_options: HooksOptions): SignalHooks<State<unknown>>;
```

Defined in: [install.ts:50](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/tc39-proposal-signals/src/install.ts#L50)

Builds the [SignalHooks](../../../core/configure/types/SignalHooks.md) that back ***Warp*Drive**'s reactivity with the
[TC39 Signals polyfill](https://github.com/proposal-signals/signal-polyfill). Each signal is a
`Signal.State` whose `equals` always returns `false`, so every notification counts as a change,
and each memo is a `Signal.Computed`. `willSyncFlushWatchers` always returns `false`, and there
is no `waitFor` hook, so requests are not wrapped for test waiters.

Importing `@warp-drive/tc39-proposal-signals/install` already passes this function to
[setupSignals](../../../core/configure/functions/setupSignals.md).

## Parameters

### \_options

[`HooksOptions`](../../../core/configure/types/HooksOptions.md)

the [HooksOptions](../../../core/configure/types/HooksOptions.md) that `setupSignals` passes in; this implementation does not read them

## Returns

[`SignalHooks`](../../../core/configure/types/SignalHooks.md)<`State`<`unknown`>>

the signal hooks backed by `signal-polyfill`

## Example

```ts
// what importing '@warp-drive/tc39-proposal-signals/install' does
import { setupSignals } from '@warp-drive/core/configure';
import { buildSignalConfig } from '@warp-drive/tc39-proposal-signals/install';

setupSignals(buildSignalConfig);
```
