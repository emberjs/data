---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/react/install/functions/buildSignalConfig.md
description: >-
  Builds the signal hooks, backed by the Signal polyfill, that connect WarpDrive
  reactivity to React rendering and test waiters.
---

# &#x20;buildSignalConfig()

```ts
function buildSignalConfig(options: HooksOptions): SignalHooks;
```

Defined in: [install.ts:81](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/react/src/install.ts#L81)

Builds the [SignalHooks](../../../core/configure/types/SignalHooks.md) implementation backed by the
[Signal Polyfill](https://github.com/proposal-signals/signal-polyfill),
used to wire WarpDrive's reactivity primitives into React.

## Parameters

### options

[`HooksOptions`](../../../core/configure/types/HooksOptions.md)

## Returns

[`SignalHooks`](../../../core/configure/types/SignalHooks.md)
