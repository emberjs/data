---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/react/types/RequestStates.md
description: >-
  The components the React `<Request />` component renders for its idle,
  loading, cancelled, error, and content states.
---

# &#x20;RequestStates\<RT, E>

```ts
interface RequestStates<RT, E> {
  cancelled?: FC<{
  error: StructuredErrorDocument<E>;
  features: RecoveryFeatures;
}>;
  content: FC<{
  features: ContentFeatures<RT>;
  result: RT;
}>;
  error: FC<{
  error: StructuredErrorDocument<E>;
  features: RecoveryFeatures;
}>;
  idle?: FC<object>;
  loading?: FC<{
  state: RequestLoadingState;
}>;
}
```

Defined in: [-private/request.tsx:173](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/react/src/-private/request.tsx#L173)

The components the [\`\<Request />\`](../functions/Request.md) component renders for
each state of its request, passed as its `states` prop.

`error` and `content` are required. The rest are optional:

* `idle`: without it, the component throws while idle
* `loading`: without it, nothing renders while the request is in flight
* `cancelled`: without it, a cancelled request renders the `error` component

## Example

```tsx
import type { RequestStates } from "@warp-drive/react";
import type { User } from "./schemas/user";

const states: RequestStates<User, unknown> = {
  loading: () => <Spinner />,
  error: ({ error, features }) => <button onClick={features.retry}>{error.message}</button>,
  content: ({ result }) => <h1>{result.name}</h1>,
};
```

## Type Parameters

### RT

`RT`

### E

`E`

## Properties

### cancelled?

```ts
optional cancelled?: FC<{
  error: StructuredErrorDocument<E>;
  features: RecoveryFeatures;
}>;
```

Defined in: [-private/request.tsx:191](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/react/src/-private/request.tsx#L191)

The component to render when the request was cancelled.

***

### content

```ts
content: FC<{
  features: ContentFeatures<RT>;
  result: RT;
}>;
```

Defined in: [-private/request.tsx:222](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/react/src/-private/request.tsx#L222)

The component to render when the request succeeded. It receives the
response as `result`, and the ContentFeatures used to refresh,
reload, or abort the request.

***

### error

```ts
error: FC<{
  error: StructuredErrorDocument<E>;
  features: RecoveryFeatures;
}>;
```

Defined in: [-private/request.tsx:205](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/react/src/-private/request.tsx#L205)

The component to render when the request failed.

***

### idle?

```ts
optional idle?: FC<object>;
```

Defined in: [-private/request.tsx:178](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/react/src/-private/request.tsx#L178)

The component to render when the component is idle and waiting to be given a request.

***

### loading?

```ts
optional loading?: FC<{
  state: RequestLoadingState;
}>;
```

Defined in: [-private/request.tsx:185](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/react/src/-private/request.tsx#L185)

The component to render when the request is loading. It receives the
RequestLoadingState.
