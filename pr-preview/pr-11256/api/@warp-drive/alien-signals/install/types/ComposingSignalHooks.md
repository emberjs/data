---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/alien-signals/install/types/ComposingSignalHooks.md
description: >-
  The signal hooks backed by the alien-signals graph, which other signals
  implementations register with.
---

# &#x20;ComposingSignalHooks&#x20;

```ts
interface ComposingSignalHooks extends Omit<SignalHooks<SignalNode>, "register"> {
  register: <K>(buildConfig: (options: HooksOptions) => SignalIntegration<K>) => void;
}
```

Defined in: [install.ts:125](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/alien-signals/src/install.ts#L125)

The [SignalHooks](../../../core/configure/types/SignalHooks.md) that [buildSignalConfig](../functions/buildSignalConfig.md) returns, whose `register` hook accepts a
[SignalIntegration](SignalIntegration.md).

## Extends

* [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)<[`SignalHooks`](../../../core/configure/types/SignalHooks.md)<[`SignalNode`](../../primitives/types/SignalNode.md)>, `"register"`>

## Properties

### register

```ts
register: <K>(buildConfig: (options: HooksOptions) => SignalIntegration<K>) => void;
```

Defined in: [install.ts:129](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/alien-signals/src/install.ts#L129)

Adds the [SignalIntegration](SignalIntegration.md) that `buildConfig` returns to the graph.

#### Type Parameters

##### K

`K`

#### Parameters

##### buildConfig

(`options`: [`HooksOptions`](../../../core/configure/types/HooksOptions.md)) => [`SignalIntegration`](SignalIntegration.md)<`K`>

#### Returns

`void`
