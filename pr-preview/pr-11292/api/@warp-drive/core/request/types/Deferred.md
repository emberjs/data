---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/request/types/Deferred.md
---

# &#x20;Deferred\<T>

```ts
type Deferred<T> = {
  promise: Promise<T>;
  reject: void;
  resolve: void;
};
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:33](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/types.ts#L33)

A promise paired with the `resolve`/`reject` callbacks that settle it,
allowing the promise to be created before the work that will settle it
has begun. See [createDeferred](../functions/createDeferred.md).

## Type Parameters

### T

`T`

## Methods

### reject()

```ts
reject(v: unknown): void;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:37](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/types.ts#L37)

Reject [promise](#promise) with the given reason.

#### Parameters

##### v

`unknown`

#### Returns

`void`

***

### resolve()

```ts
resolve(v: T): void;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:35](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/types.ts#L35)

Resolve [promise](#promise) with the given value.

#### Parameters

##### v

`T`

#### Returns

`void`

## Properties

### promise

```ts
promise: Promise<T>;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:39](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/types.ts#L39)

The promise controlled by [resolve](#resolve) and [reject](#reject).
