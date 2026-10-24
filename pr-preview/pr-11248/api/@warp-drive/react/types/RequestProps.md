---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/react/types/RequestProps.md
description: >-
  The props of the React `<Request />` component: the state components, the
  request or query to run, store, subscription, autorefresh options, and chrome.
---

# &#x20;RequestProps\<RT, E>

```ts
interface RequestProps<RT, E> extends RequestArgs<RT, E> {
  chrome?: FC<ChromeComponentProps<RT>>;
  states: RequestStates<RT, E>;
}
```

Defined in: [-private/request.tsx:123](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/react/src/-private/request.tsx#L123)

The props accepted by the [\`\<Request />\`](../functions/Request.md) component.

`states` is required. Every other prop is optional, but either `request` or
`query` is needed for the component to leave the `idle` state, and a store
must be available via the `store` prop or a [StoreProvider](../functions/StoreProvider.md).

| Prop | Type | Purpose |
| --- | --- | --- |
| `states` | [RequestStates](RequestStates.md) | The components to render for each state |
| `request` | `Future` | A request already made via `store.request` to monitor |
| `query` | `StoreRequestInput` | A request for the component to make and monitor |
| `store` | `Store` or `RequestManager` | The store to make requests with |
| `subscription` | `RequestSubscription` | A subscription to render in place of creating one |
| `autorefresh` | `boolean` or `string` | When to automatically refresh the request |
| `autorefreshThreshold` | `number` | How long in ms before an autorefresh happens |
| `autorefreshBehavior` | `'refresh'`, `'reload'` or `'policy'` | How autorefresh fetches |
| `chrome` | `React.FC` | A component that wraps every state's component |

All but `states` and `chrome` are inherited from RequestArgs and
documented on the members below.

## Example

```tsx
import { Request } from "@warp-drive/react";
import { findRecord } from "@warp-drive/utilities/json-api";

export function UserName({ id }: { id: string }) {
  return (
    <Request
      query={findRecord("user", id)}
      autorefresh="online,interval"
      autorefreshThreshold={60_000}
      autorefreshBehavior="refresh"
      states={{
        content: ({ result }) => <>{result.data.name}</>,
        error: ({ error }) => <>{error.message}</>,
      }}
    />
  );
}
```

## Extends

* `RequestArgs`<`RT`, `E`>

## Type Parameters

### RT

`RT`

### E

`E`

## Properties

### chrome?

```ts
optional chrome?: FC<ChromeComponentProps<RT>>;
```

Defined in: [-private/request.tsx:138](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/react/src/-private/request.tsx#L138)

A component that wraps whichever state component is rendered, so shared
UI such as a layout or a refresh indicator stays mounted as the request
moves between states. It renders its `children` where the state's
component renders, and receives the [ChromeComponentProps](ChromeComponentProps.md).

```tsx
function Chrome({ children, features }: ChromeComponentProps<User>) {
  return <div className={features.isRefreshing ? "is-refreshing" : ""}>{children}</div>;
}

<Request request={request} chrome={Chrome} states={states} />
```

***

### states

```ts
states: RequestStates<RT, E>;
```

Defined in: [-private/request.tsx:144](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/react/src/-private/request.tsx#L144)

The components to render for each state of the request, see
[RequestStates](RequestStates.md).
