---
url: /pr-preview/pr-11154/api/@warp-drive/core/reactive/types/RejectedPromise.md
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

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:156](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L156)

The state of a promise in the "rejected" state.
This is the state of a promise that has rejected
with an error.

## Type Parameters

### E

`E`

## Properties

### ~~error~~&#x20;

```ts
error: E;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:212](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L212)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

***

### isError

```ts
isError: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:188](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L188)

Whether the promise has rejected
with an error.

***

### ~~isLoading~~&#x20;

```ts
isLoading: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:174](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L174)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

***

### isPending

```ts
isPending: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:167](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L167)

Whether the promise is pending.

***

### isSuccess

```ts
isSuccess: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:181](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L181)

Whether the promise has resolved
successfully.

***

### reason

```ts
reason: E;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:219](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L219)

Once the promise has rejected, this will
be the error the promise rejected with.

***

### ~~result~~&#x20;

```ts
result: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:203](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L203)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

***

### status

```ts
status: "rejected";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:161](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L161)

The status of the promise.

***

### value

```ts
value: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:195](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/promise-state.ts#L195)

Once the promise has resolved, this will
be the value the promise resolved to.
