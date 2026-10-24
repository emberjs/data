---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/request/types/Deferred.md
description: >-
  A promise bundled with the `resolve` and `reject` callbacks that settle it, as
  returned by `createDeferred`.
---

# &#x20;Deferred\<T>

```ts
type Deferred<T> = {
  promise: Promise<T>;
  reject: void;
  resolve: void;
};
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:35](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/types.ts#L35)

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

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:39](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/types.ts#L39)

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

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:37](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/types.ts#L37)

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

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:41](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/types.ts#L41)

The promise controlled by [resolve](#resolve) and [reject](#reject).
