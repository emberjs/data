---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/ember/types/RequestSignature.md
description: >-
  The Glint signature of the Ember `<Request />` component: its args and the
  blocks it yields to for each request state.
---

# &#x20;RequestSignature\<RT, E>

```ts
interface RequestSignature<RT, E> {
  Args: EmberRequestArgs<RT, E>;
  Blocks: { always: [state: RequestState<RT, StructuredErrorDocument<E>>]; cancelled: [error: StructuredErrorDocument<E>, features: RecoveryFeatures]; content: [value: RT, features: ContentFeatures<RT>]; error: [error: StructuredErrorDocument<E>, features: RecoveryFeatures]; idle: []; loading: [state: RequestLoadingState] };
}
```

Defined in: [warp-drive-packages/ember/src/-private/request.gts:132](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/ember/src/-private/request.gts#L132)

The Glint signature of the [\`\<Request />\`](../classes/Request.md) component: the
[args](EmberRequestArgs.md) it accepts and the blocks it yields to.

## Example

```ts
import type { RequestSignature } from '@warp-drive/ember';
import type { User } from './schemas/user';

type UserRequestArgs = RequestSignature<User, unknown>['Args'];
```

## Type Parameters

### RT

`RT`

### E

`E`

## Properties

### Args

```ts
Args: EmberRequestArgs<RT, E>;
```

Defined in: [warp-drive-packages/ember/src/-private/request.gts:136](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/ember/src/-private/request.gts#L136)

The args the component accepts, see [EmberRequestArgs](EmberRequestArgs.md).

***

### Blocks

```ts
Blocks: {
  always: [state: RequestState<RT, StructuredErrorDocument<E>>];
  cancelled: [error: StructuredErrorDocument<E>, features: RecoveryFeatures];
  content: [value: RT, features: ContentFeatures<RT>];
  error: [error: StructuredErrorDocument<E>, features: RecoveryFeatures];
  idle: [];
  loading: [state: RequestLoadingState];
};
```

Defined in: [warp-drive-packages/ember/src/-private/request.gts:137](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/ember/src/-private/request.gts#L137)

#### always

```ts
always: [state: RequestState<RT, StructuredErrorDocument<E>>];
```

The block to render in every state except idle, after whichever
state-specific block is rendered, with the current RequestState.

#### cancelled

```ts
cancelled: [error: StructuredErrorDocument<E>, features: RecoveryFeatures];
```

The block to render when the request was cancelled.

#### content

```ts
content: [value: RT, features: ContentFeatures<RT>];
```

The block to render when the request succeeded.

#### error

```ts
error: [error: StructuredErrorDocument<E>, features: RecoveryFeatures];
```

The block to render when the request failed. If this block is not provided,
the error will be rethrown.

Thus it is required to provide an error block and proper error handling if
you do not want the error to crash the application.

#### idle

```ts
idle: [];
```

The block to render when the component is idle and waiting to be given a request.

#### loading

```ts
loading: [state: RequestLoadingState];
```

The block to render when the request is loading.
