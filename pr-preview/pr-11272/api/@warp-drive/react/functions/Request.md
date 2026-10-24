---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/react/functions/Request.md
---

# &#x20;Request()

```ts
function Request<RT, E>($props: RequestProps<RT, E>): Element;
```

Defined in: [-private/request.tsx:180](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/react/src/-private/request.tsx#L180)

The `<Request />` component is a powerful tool for managing data fetching and
state in your React application. It provides a declarative approach to reactive
control-flow for managing requests and state in your application.

The `<Request />` component is ideal for handling "boundaries", outside which some
state is still allowed to be unresolved and within which it MUST be resolved.

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

`RequestProps`<`RT`, `E`>

## Returns

`Element`
