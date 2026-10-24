---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/core/configure/functions/registerSignals.md
description: >-
  Registers signal hooks with the configured composing implementation, or
  configures them with `setupSignals` when there is none.
---

# &#x20;registerSignals()&#x20;

```ts
function registerSignals<T>(buildConfig: (options: HooksOptions) => SignalHooks<T>): void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:227](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/signals/reactivity/configure.ts#L227)

Adds the hooks built by `buildConfig` to the configured signals implementation if it composes
other implementations, such as `@warp-drive/alien-signals`, and otherwise configures them with
[setupSignals](setupSignals.md).

A framework's `install` entry point calls this rather than `setupSignals`, so that importing
`@warp-drive/alien-signals/install` first lets every framework on the page share its signals
and memos.

## Type Parameters

### T

`T`

## Parameters

### buildConfig

(`options`: [`HooksOptions`](../types/HooksOptions.md)) => [`SignalHooks`](../types/SignalHooks.md)<`T`>

a function that takes options and returns a configuration object

## Returns

`void`

## Example

```ts
import { registerSignals } from '@warp-drive/core/configure';

registerSignals(buildSignalConfig);
```
