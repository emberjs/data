---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/configure/functions/setupSignals.md
---

# &#x20;setupSignals()

```ts
function setupSignals<T>(buildConfig: (options: HooksOptions) => SignalHooks<T>): void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:164](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/reactivity/configure.ts#L164)

Configures the signals implementation to use. Supports multiple
implementations simultaneously.

See [HooksOptions](../types/HooksOptions.md) for the options passed to the provided function
when called.

See [SignalHooks](../types/SignalHooks.md) for the implementation the callback function should
return.

## Type Parameters

### T

`T`

## Parameters

### buildConfig

(`options`: [`HooksOptions`](../types/HooksOptions.md)) => [`SignalHooks`](../types/SignalHooks.md)<`T`>

a function that takes options and returns a configuration object

## Returns

`void`
