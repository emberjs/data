---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/react/types/ChromeComponentProps.md
description: >-
  The props the React `<Request />` component passes to its `chrome` component:
  the rendered state, the request state, and the content features.
---

# &#x20;ChromeComponentProps\<RT>

```ts
interface ChromeComponentProps<RT> {
  children: ReactNode;
  features: ContentFeatures<RT>;
  state: RequestState | null;
}
```

Defined in: [-private/request.tsx:57](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/react/src/-private/request.tsx#L57)

The props passed to the component given as the `chrome` prop of
[\`\<Request />\`](../functions/Request.md).

## Example

```tsx
import type { ChromeComponentProps } from "@warp-drive/react";

function Chrome({ children, features }: ChromeComponentProps<unknown>) {
  return <div className={features.isRefreshing ? "is-refreshing" : ""}>{children}</div>;
}
```

## Type Parameters

### RT

`RT`

## Properties

### children

```ts
children: ReactNode;
```

Defined in: [-private/request.tsx:61](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/react/src/-private/request.tsx#L61)

Whichever state component `<Request />` is rendering.

***

### features

```ts
features: ContentFeatures<RT>;
```

Defined in: [-private/request.tsx:69](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/react/src/-private/request.tsx#L69)

The ContentFeatures used to refresh, reload, or abort the request.

***

### state

```ts
state: RequestState | null;
```

Defined in: [-private/request.tsx:65](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/react/src/-private/request.tsx#L65)

The RequestState of the request, or `null` while idle.
