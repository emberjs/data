---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/react/types/StoreProviderProps.md
description: >-
  The props of the React `<StoreProvider />` component: its children plus either
  a Store instance or a Store class to instantiate.
---

# &#x20;StoreProviderProps

```ts
type StoreProviderProps = 
  | {
  children: ReactNode;
  store: Store;
}
  | {
  children: ReactNode;
  Store: typeof Store;
};
```

Defined in: [-private/store-provider.tsx:62](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/react/src/-private/store-provider.tsx#L62)

The props accepted by [\`\<StoreProvider />\`](../functions/StoreProvider.md): `children`,
and either `store`, an existing Store instance to provide, or `Store`, a
Store class the provider creates an instance of for you.

## Union Members

### Type Literal

```ts
{
  children: ReactNode;
  store: Store;
}
```

#### children

```ts
children: ReactNode;
```

The components that can read the store with [useStore](../functions/useStore.md).

#### store

```ts
store: Store;
```

The Store instance to provide.

***

### Type Literal

```ts
{
  children: ReactNode;
  Store: typeof Store;
}
```

#### children

```ts
children: ReactNode;
```

The components that can read the store with [useStore](../functions/useStore.md).

#### Store

```ts
Store: typeof Store;
```

A Store class the provider creates an instance of for you and provides.
Changing the class creates a new store, so import it from a module
rather than defining it inside a component.

## Example

```tsx
import type { StoreProviderProps } from "@warp-drive/react";

const props: StoreProviderProps = { store, children: <App /> };
```
