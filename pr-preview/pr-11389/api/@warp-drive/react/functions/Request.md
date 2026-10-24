---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/react/functions/Request.md
description: >-
  Component that renders idle, loading, error, cancelled, or content states for
  a request as it progresses, with retry and refresh support.
---

# &#x20;Request()

```ts
function Request<RT, E>($props: RequestProps<RT, E>): Element;
```

Defined in: [-private/request.tsx:316](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/react/src/-private/request.tsx#L316)

The `<Request />` component is a powerful tool for managing data fetching and
state in your React application. It provides a declarative approach to reactive
control-flow for managing requests and state in your application.

The `<Request />` component is ideal for handling "boundaries", outside which some
state is still allowed to be unresolved and within which it MUST be resolved.

See [Reactive Control Flow](/guides/the-manual/reactivity/control-flow) for how it
works together with the JS API.

## Props

Pass a `states` object with a component for each state (see below). Then
pass either `request`, a request already made with `store.request`, or
`query`, a request for the component to make. The store comes from the
`store` prop, else from the nearest [StoreProvider](StoreProvider.md). The component
also accepts `subscription`, `autorefresh`, `autorefreshThreshold`,
`autorefreshBehavior`, and `chrome`.

See [RequestProps](../types/RequestProps.md) for the full list of props, and
[RequestStates](../types/RequestStates.md) for the components you can pass in `states`.

## Request States

`<Request />` has five states, only one of which will be active and rendered at a time.

* `idle`: The component is waiting to be given a request to monitor
* `loading`: The request is in progress
* `error`: The request failed
* `content`: The request succeeded
* `cancelled`: The request was cancelled

Additionally, the `content` state has a `refresh` method that can be used to
refresh the request in the background, which is available as a sub-state of
the `content` state.

### Example Usage

```tsx
import { Request } from "@warp-drive/react";
import { findRecord } from "@warp-drive/utilities/json-api";

export function UserPreview($props: { id: string | null }) {
  return (
   <Request
      query={findRecord('user', $props.id)}
      states={{
        idle: () => <div>Waiting for User Selection</div>,
        loading: ({ state }) => <div>Loading user data...</div>,
        cancelled: ({ error, features }) => (
          <div>
            <p>Request Cancelled</p>
            <p><button onClick={features.retry}>Start Again?</button></p>
          </div>
        ),
        error: ({ error, features }) => (
          <div>
            <p>Error: {error.message}</p>
            <p><button onClick={features.retry}>Try Again?</button></p>
          </div>
        ),
        content: ({ result, features }) => (
          <div>
           <h2>User Details</h2>
           <p>ID: {result.id}</p>
           <p>Name: {result.name}</p>
         </div>
       ),
     }}
   />
  );
}

```

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### $props

[`RequestProps`](../types/RequestProps.md)<`RT`, `E`>

## Returns

`Element`
