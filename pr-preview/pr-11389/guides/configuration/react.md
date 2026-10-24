---
url: https://canary.warp-drive.io/pr-preview/pr-11389/guides/configuration/react.md
description: >-
  Provide your WarpDrive store to React components with StoreProvider, read it
  with useStore, and know when a component re-renders.
---

# Setup - React

This page covers the React-specific setup that comes after
[installing `@warp-drive/react`](/guides/installation/#react) and
[configuring your store](/guides/configuration/#configure-the-store).

## Provide the Store

Once you have a store class, which [Configure The Store](/guides/configuration/#configure-the-store)
creates, React components get it through React context. Wrap the app in
[`<StoreProvider />`](/api/@warp-drive/react/functions/StoreProvider) and give it that class as its
`Store` prop, and it creates the instance for you. To provide a store that already exists, pass
the instance as `store` instead; see [Use a Store You Already Have](#use-a-store-you-already-have).

```tsx [src/app.tsx]
import { StoreProvider } from '@warp-drive/react';
import AppStore from './store';
import { UserList } from './user-list';

export function App() {
  return (
    <StoreProvider Store={AppStore}>
      <UserList />
    </StoreProvider>
  );
}
```

The provider keeps the instance it created for as long as it receives the same class, so import
the class from a module rather than defining it inside a component, where every render would
create a new class and a new, empty store. Even with the same class, React may discard the
instance and create another: in development builds, Strict Mode creates the store twice and keeps
one. If your app must have exactly one store instance, create it yourself and pass it as `store`.

Any component inside the provider reads the store with
[`useStore`](/api/@warp-drive/react/functions/useStore). In development builds, calling it
outside a `<StoreProvider />` throws an error. Production builds skip that check, and it returns
`null`.

```tsx [src/reload-button.tsx]
import { useStore } from '@warp-drive/react';
import { findRecord } from '@warp-drive/utilities/json-api';

export function ReloadButton({ userId }: { userId: string }) {
  const store = useStore();

  return (
    <button onClick={() => store.request(findRecord('user', userId, { reload: true }))}>
      Reload
    </button>
  );
}
```

The React [`<Request />`](/api/@warp-drive/react/functions/Request) component reads the store
the same way when you don't pass it a `store` prop. Reading the store doesn't re-render a
component when its data changes; a
[`<ReactiveContext />`](/api/@warp-drive/react/functions/ReactiveContext) does that, and
`<Request />` already wraps its content in one. To render a request's loading, error and content
states, see [Reactive Control Flow](/guides/the-manual/reactivity/control-flow.md).

## Use a Store You Already Have

Pass an existing instance as the `store` prop when something outside React owns the store: a
module that creates it once at startup, a test that sets it up, or a host app that mounts React
components into part of its page. Every `<StoreProvider />` given the same instance provides the
same store, so separately mounted React roots share one cache and see the same requests.

```tsx [src/mount-user-list.tsx]
import { createRoot } from 'react-dom/client';
import type { Store } from '@warp-drive/core';
import { StoreProvider } from '@warp-drive/react';
import { UserList } from './user-list';

export function mountUserList(element: HTMLElement, store: Store): () => void {
  const root = createRoot(element);
  root.render(
    <StoreProvider store={store}>
      <UserList />
    </StoreProvider>
  );
  return () => root.unmount();
}
```

The host app calls `mountUserList` with the element to render into and its own store, and calls
the returned function when it removes that element.

::: tip Embedding React in an app built with another framework
One store can drive components from both frameworks, but each framework only re-renders for its
own signals. For components in both to re-render when data changes, import
`@warp-drive/alien-signals/install` before either framework's `install` import, so that both
frameworks share its signals graph. Memoized values such as
[derived fields](/guides/the-manual/schemas/derivations.md) then only recompute when a signal
***Warp*Drive** manages changes, not when state that only a framework tracks, such as an Ember
`@tracked` property, changes. See
[Can I use multiple frameworks on one page?](/guides/faq/multiple-frameworks.md), and for Ember
and React,
[Using Ember and React on the Same Page](/guides/the-manual/cookbook/multiple-frameworks-on-one-page.md).
An Ember app doesn't need PolarisMode to share its store with React; see
[Do I need PolarisMode to share state between Ember and React on the same page?](/guides/faq/polaris-mode-with-ember-and-react.md).
:::
