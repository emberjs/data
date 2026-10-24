---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/react/functions/StoreProvider.md
description: >-
  Component that provides a Store to its children, either the instance passed in
  or a new instance of the Store class passed in.
---

# &#x20;StoreProvider()

```ts
function StoreProvider($props: StoreProviderProps): Element;
```

Defined in: [-private/store-provider.tsx:129](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/react/src/-private/store-provider.tsx#L129)

Provides a Store to its children, which read it with [useStore](useStore.md).
`<Request />` uses it when no `store` prop is given.

Pass either `store`, an existing Store instance, or `Store`, a Store class
the provider creates an instance of for you. See [StoreProviderProps](../types/StoreProviderProps.md).

For where this fits in app setup, see
[Provide the Store in React](/guides/configuration/react#provide-the-store).

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

To provide a store created outside React, such as one a host app already
uses, pass the instance instead:

```tsx
import { StoreProvider } from "@warp-drive/react";
import { store } from "./services/store";

root.render(
  <StoreProvider store={store}>
    <UserPreview id="1" />
  </StoreProvider>
);
```
