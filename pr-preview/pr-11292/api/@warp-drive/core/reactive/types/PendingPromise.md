---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/types/PendingPromise.md
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

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:14](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L14)

The state of a promise in the "pending"
state. This is the default initial state.

## Properties

### ~~error~~&#x20;

```ts
error: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:69](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L69)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

***

### isError

```ts
isError: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:46](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L46)

Whether the promise has rejected
with an error.

***

### ~~isLoading~~&#x20;

```ts
isLoading: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:32](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L32)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

***

### isPending

```ts
isPending: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:25](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L25)

Whether the promise is pending.

***

### isSuccess

```ts
isSuccess: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:39](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L39)

Whether the promise has resolved
successfully.

***

### reason

```ts
reason: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:76](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L76)

Once the promise has rejected, this will
be the error the promise rejected with.

***

### ~~result~~&#x20;

```ts
result: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:60](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L60)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

***

### status

```ts
status: "pending";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:19](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L19)

The status of the promise.

***

### value

```ts
value: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:53](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L53)

Once the promise has resolved, this will
be the value the promise resolved to.
