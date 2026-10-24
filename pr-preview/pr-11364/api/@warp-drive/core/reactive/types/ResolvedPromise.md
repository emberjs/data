---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/reactive/types/ResolvedPromise.md
description: >-
  The `getPromiseState` state for a promise that resolved, with `isSuccess` true
  and the resolved `value`.
---

# &#x20;ResolvedPromise\<T>

```ts
interface ResolvedPromise<T> {
  error: null;
  isError: false;
  isLoading: false;
  isPending: false;
  isSuccess: true;
  reason: null;
  result: T;
  status: "fulfilled";
  value: T;
}
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:89](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L89)

The state of a promise in the "fulfilled" state.
This is the state of a promise that has resolved
successfully.

## Extended by

* [`ResolvedRequest`](ResolvedRequest.md)

## Type Parameters

### T

`T`

## Properties

### ~~error~~&#x20;

```ts
error: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:144](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L144)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

***

### isError

```ts
isError: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:120](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L120)

Whether the promise has rejected
with an error.

***

### ~~isLoading~~&#x20;

```ts
isLoading: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:107](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L107)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

***

### isPending

```ts
isPending: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:100](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L100)

Whether the promise is pending.

***

### isSuccess

```ts
isSuccess: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:113](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L113)

Whether the promise has resolved
successfully.

***

### reason

```ts
reason: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:151](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L151)

Once the promise has rejected, this will
be the error the promise rejected with.

***

### ~~result~~&#x20;

```ts
result: T;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:135](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L135)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

***

### status

```ts
status: "fulfilled";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:94](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L94)

The status of the promise.

***

### value

```ts
value: T;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:127](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/promise-state.ts#L127)

Once the promise has resolved, this will
be the value the promise resolved to.
