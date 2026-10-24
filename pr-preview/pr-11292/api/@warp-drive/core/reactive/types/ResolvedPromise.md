---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/types/ResolvedPromise.md
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

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:85](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L85)

The state of a promise in the "fulfilled" state.
This is the state of a promise that has resolved
successfully.

## Type Parameters

### T

`T`

## Properties

### ~~error~~&#x20;

```ts
error: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:140](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L140)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

***

### isError

```ts
isError: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:116](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L116)

Whether the promise has rejected
with an error.

***

### ~~isLoading~~&#x20;

```ts
isLoading: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:103](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L103)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

***

### isPending

```ts
isPending: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:96](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L96)

Whether the promise is pending.

***

### isSuccess

```ts
isSuccess: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:109](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L109)

Whether the promise has resolved
successfully.

***

### reason

```ts
reason: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:147](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L147)

Once the promise has rejected, this will
be the error the promise rejected with.

***

### ~~result~~&#x20;

```ts
result: T;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:131](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L131)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

***

### status

```ts
status: "fulfilled";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:90](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L90)

The status of the promise.

***

### value

```ts
value: T;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:123](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L123)

Once the promise has resolved, this will
be the value the promise resolved to.
