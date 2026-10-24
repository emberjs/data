---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/react/install/functions/buildSignalConfig.md
description: >-
  Builds the signal hooks, backed by the Signal polyfill, that connect WarpDrive
  reactivity to React rendering and test waiters.
---

# &#x20;buildSignalConfig()

```ts
function buildSignalConfig(options: HooksOptions): SignalHooks;
```

Defined in: [install.ts:81](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/react/src/install.ts#L81)

Builds the [SignalHooks](../../../core/configure/types/SignalHooks.md) implementation backed by the
[Signal Polyfill](https://github.com/proposal-signals/signal-polyfill),
used to wire WarpDrive's reactivity primitives into React.

## Parameters

### options

[`HooksOptions`](../../../core/configure/types/HooksOptions.md)

## Returns

[`SignalHooks`](../../../core/configure/types/SignalHooks.md)
