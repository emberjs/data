---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/react/functions/StoreProvider.md
description: >-
  Component that provides a Store to its children, either the instance passed in
  or a new instance of the Store class passed in.
---

# &#x20;StoreProvider()

```ts
function StoreProvider($props: StoreProviderProps): Element;
```

Defined in: [-private/store-provider.tsx:89](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/react/src/-private/store-provider.tsx#L89)

Provides a Store to its children, which read it with [useStore](useStore.md).
`<Request />` uses it when no `store` prop is given.

Pass either `store`, an existing Store instance, or `Store`, a Store class
the provider instantiates once. See [StoreProviderProps](../types/StoreProviderProps.md).

## Parameters

### $props

[`StoreProviderProps`](../types/StoreProviderProps.md)

## Returns

`Element`

## Example

```tsx
import { StoreProvider } from "@warp-drive/react";
import AppStore from "./services/store";

export function App() {
  return (
    <StoreProvider Store={AppStore}>
      <UserPreview id="1" />
    </StoreProvider>
  );
}
```
