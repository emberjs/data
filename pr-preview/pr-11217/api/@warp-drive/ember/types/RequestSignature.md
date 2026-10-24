---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/ember/types/RequestSignature.md
description: >-
  The Glint signature of the Ember `<Request />` component: its args and the
  blocks it yields to for each request state.
---

# &#x20;RequestSignature\<RT, E>

```ts
interface RequestSignature<RT, E> {
  Args: EmberRequestArgs<RT, E>;
  Blocks: { always: [RequestState<RT, StructuredErrorDocument<E>>]; cancelled: [StructuredErrorDocument<E>, RecoveryFeatures]; content: [RT, ContentFeatures<RT>]; error: [StructuredErrorDocument<E>, RecoveryFeatures]; idle: []; loading: [RequestLoadingState] };
}
```

Defined in: [warp-drive-packages/ember/src/-private/request.gts:132](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/ember/src/-private/request.gts#L132)

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

Defined in: [warp-drive-packages/ember/src/-private/request.gts:136](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/ember/src/-private/request.gts#L136)

The args the component accepts, see [EmberRequestArgs](EmberRequestArgs.md).

***

### Blocks

```ts
Blocks: {
  always: [RequestState<RT, StructuredErrorDocument<E>>];
  cancelled: [StructuredErrorDocument<E>, RecoveryFeatures];
  content: [RT, ContentFeatures<RT>];
  error: [StructuredErrorDocument<E>, RecoveryFeatures];
  idle: [];
  loading: [RequestLoadingState];
};
```

Defined in: [warp-drive-packages/ember/src/-private/request.gts:137](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/ember/src/-private/request.gts#L137)

#### always

```ts
always: [RequestState<RT, StructuredErrorDocument<E>>];
```

The block to render in every state except idle, after whichever
state-specific block is rendered, with the current RequestState.

#### cancelled

```ts
cancelled: [StructuredErrorDocument<E>, RecoveryFeatures];
```

The block to render when the request was cancelled.

#### content

```ts
content: [RT, ContentFeatures<RT>];
```

The block to render when the request succeeded.

#### error

```ts
error: [StructuredErrorDocument<E>, RecoveryFeatures];
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
loading: [RequestLoadingState];
```

The block to render when the request is loading.
