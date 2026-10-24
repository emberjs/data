---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/react/functions/useStore.md
description: >-
  Hook that returns the Store provided by the nearest `StoreProvider`, asserting
  that one exists.
---

# &#x20;useStore()

```ts
function useStore(): Store$1;
```

Defined in: [-private/store-provider.tsx:37](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/react/src/-private/store-provider.tsx#L37)

Returns the Store provided by the nearest [StoreProvider](StoreProvider.md). In development
builds, calling it outside a `<StoreProvider />` throws an error.

For how to set up the provider, see
[Provide the Store in React](/guides/configuration/react#provide-the-store).

## Returns

`Store$1`

## Example

```tsx
import { useStore } from "@warp-drive/react";
import { findRecord } from "@warp-drive/utilities/json-api";

export function ReloadButton({ userId }: { userId: string }) {
  const store = useStore();
  return (
    <button onClick={() => store.request(findRecord("user", userId, { reload: true }))}>
      Reload
    </button>
  );
}
```
