---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/core/reactive/types/RejectedPromise.md
description: >-
  The `getPromiseState` state for a promise that rejected, with `isError` true
  and the rejection `reason`.
---

# &#x20;RejectedPromise\<E>

```ts
interface RejectedPromise<E> {
  error: E;
  isError: true;
  isLoading: false;
  isPending: false;
  isSuccess: false;
  reason: E;
  result: null;
  status: "rejected";
  value: null;
}
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:162](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L162)

The state of a promise in the "rejected" state.
This is the state of a promise that has rejected
with an error.

## Extended by

* [`RejectedRequest`](RejectedRequest.md)

## Type Parameters

### E

`E`

## Properties

### ~~error~~&#x20;

```ts
error: E;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:218](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L218)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

***

### isError

```ts
isError: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:194](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L194)

Whether the promise has rejected
with an error.

***

### ~~isLoading~~&#x20;

```ts
isLoading: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:180](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L180)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

***

### isPending

```ts
isPending: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:173](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L173)

Whether the promise is pending.

***

### isSuccess

```ts
isSuccess: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:187](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L187)

Whether the promise has resolved
successfully.

***

### reason

```ts
reason: E;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:225](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L225)

Once the promise has rejected, this will
be the error the promise rejected with.

***

### ~~result~~&#x20;

```ts
result: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:209](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L209)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

***

### status

```ts
status: "rejected";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:167](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L167)

The status of the promise.

***

### value

```ts
value: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:201](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/promise-state.ts#L201)

Once the promise has resolved, this will
be the value the promise resolved to.
