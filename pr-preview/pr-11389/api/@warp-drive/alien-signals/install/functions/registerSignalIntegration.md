---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/alien-signals/install/functions/registerSignalIntegration.md
description: >-
  Adds a signals implementation or framework integration to the alien-signals
  graph.
---

# &#x20;registerSignalIntegration()&#x20;

```ts
function registerSignalIntegration<T>(buildConfig: (options: HooksOptions) => SignalIntegration<T>): void;
```

Defined in: [install.ts:356](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L356)

Adds a [SignalIntegration](../types/SignalIntegration.md) to the graph that `@warp-drive/alien-signals/install`
configured. Use it to build a framework integration on
[`@warp-drive/alien-signals/primitives`](/api/@warp-drive/alien-signals/primitives/), the way
`@warp-drive/react` does.

Hooks that also work on their own, without this graph, should be passed to `registerSignals`
from `@warp-drive/core/configure` instead. It registers them with this graph when the graph is
configured, and configures them with `setupSignals` when it is not.

Throws if the graph is not the configured signals implementation, or if the integration creates
its own signals and ***Warp*Drive** has already created signals.

## Type Parameters

### T

`T`

## Parameters

### buildConfig

(`options`: [`HooksOptions`](../../../core/configure/types/HooksOptions.md)) => [`SignalIntegration`](../types/SignalIntegration.md)<`T`>

a function that takes the [HooksOptions](../../../core/configure/types/HooksOptions.md) and returns the integration's hooks

## Returns

`void`

## Example

```ts
import { isTracking } from '@warp-drive/alien-signals/primitives';
import { registerSignalIntegration } from '@warp-drive/alien-signals/install';

registerSignalIntegration(() => ({
  // called with each signal as it is consumed, and each memo just before it is read
  consumeSignal: (node) => {
    if (!isTracking()) watchInCurrentComponent(node);
  },
}));
```
