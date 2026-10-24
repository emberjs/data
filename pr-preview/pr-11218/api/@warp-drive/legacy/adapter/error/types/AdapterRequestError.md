---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/legacy/adapter/error/types/AdapterRequestError.md
description: >-
  Legacy adapter error shape: an `Error` flagged `isAdapterError` with a `code`
  string and a {json:api} `errors` array, as thrown by `AdapterError` and its
  subclasses.
---

&#x20;

# &#x20;AdapterRequestError\<T *extends* `string` = `string`>

```ts
interface AdapterRequestError<T extends string = string> extends Error {
  code: T;
  errors: ApiError[];
  isAdapterError: true;
}
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:49](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/legacy/src/adapter/error.ts#L49)

The shape of the errors thrown/returned by [AdapterError](../variables/AdapterError.md) and its subclasses.

## Extends

* [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)

## Type Parameters

### T

`T` *extends* `string` = `string`

## Properties

### code

```ts
code: T;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:57](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/legacy/src/adapter/error.ts#L57)

A short code identifying the kind of error, e.g. `'NotFoundError'`.

***

### errors

```ts
errors: ApiError[];
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:61](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/legacy/src/adapter/error.ts#L61)

The {json:api} formatted errors associated with the request.

***

### isAdapterError

```ts
isAdapterError: true;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:53](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/legacy/src/adapter/error.ts#L53)

A property signifying that an Error uses the AdapterRequestError interface.
