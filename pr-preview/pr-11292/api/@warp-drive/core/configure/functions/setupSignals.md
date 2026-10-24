---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/configure/functions/setupSignals.md
---

# &#x20;setupSignals()

```ts
function setupSignals<T>(buildConfig: (options: HooksOptions) => SignalHooks<T>): void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:164](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/reactivity/configure.ts#L164)

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
