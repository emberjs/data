---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/core/reactive/types/PendingPromise.md
description: >-
  The `getPromiseState` state for a promise that has not yet settled, with
  `isPending` true and no value or reason.
---

# &#x20;PendingPromise

```ts
interface PendingPromise {
  error: null;
  isError: false;
  isLoading: true;
  isPending: true;
  isSuccess: false;
  reason: null;
  result: null;
  status: "pending";
  value: null;
}
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:16](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L16)

The state of a promise in the "pending"
state. This is the default initial state.

## Extended by

* [`PendingRequest`](PendingRequest.md)

## Properties

### ~~error~~&#x20;

```ts
error: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:71](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L71)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

***

### isError

```ts
isError: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:48](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L48)

Whether the promise has rejected
with an error.

***

### ~~isLoading~~&#x20;

```ts
isLoading: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:34](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L34)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

***

### isPending

```ts
isPending: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:27](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L27)

Whether the promise is pending.

***

### isSuccess

```ts
isSuccess: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:41](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L41)

Whether the promise has resolved
successfully.

***

### reason

```ts
reason: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:78](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L78)

Once the promise has rejected, this will
be the error the promise rejected with.

***

### ~~result~~&#x20;

```ts
result: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:62](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L62)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

***

### status

```ts
status: "pending";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:21](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L21)

The status of the promise.

***

### value

```ts
value: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:55](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L55)

Once the promise has resolved, this will
be the value the promise resolved to.
