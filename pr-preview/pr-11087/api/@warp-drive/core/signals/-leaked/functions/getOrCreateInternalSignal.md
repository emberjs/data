---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/signals/-leaked/functions/getOrCreateInternalSignal.md
---

# &#x20;getOrCreateInternalSignal()

```ts
function getOrCreateInternalSignal(
   signals: SignalStore, 
   obj: object, 
   key: string | symbol, 
   initialValue: unknown
): WarpDriveSignal;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/internal.ts:232](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/internal.ts#L232)

## Parameters

### signals

[`SignalStore`](../types/SignalStore.md)

### obj

`object`

### key

`string` | `symbol`

### initialValue

`unknown`

## Returns

`WarpDriveSignal`
