---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/react/install/functions/buildSignalConfig.md
description: >-
  Builds the hooks that connect the `@warp-drive/alien-signals` graph to React
  rendering and test waiters.
---

# &#x20;buildSignalConfig()

```ts
function buildSignalConfig(_options: HooksOptions): SignalIntegration;
```

Defined in: [install.ts:95](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/react/src/install.ts#L95)

Builds the [SignalIntegration](../../../alien-signals/install/types/SignalIntegration.md) that connects the
[`@warp-drive/alien-signals`](/api/@warp-drive/alien-signals/install/) graph to React rendering
and test waiters. Signals and memos read while a component renders are watched by the watcher of
its nearest `ReactiveContext`.

Importing `@warp-drive/react/install` imports `@warp-drive/alien-signals/install` and passes
this function to `registerSignalIntegration`, so React components re-render alongside any other
framework registered with the same graph.

## Parameters

### \_options

[`HooksOptions`](../../../core/configure/types/HooksOptions.md)

## Returns

[`SignalIntegration`](../../../alien-signals/install/types/SignalIntegration.md)
