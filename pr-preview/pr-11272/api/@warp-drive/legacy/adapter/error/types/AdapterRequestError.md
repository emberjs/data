---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/adapter/error/types/AdapterRequestError.md
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

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:40](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/error.ts#L40)

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

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:48](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/error.ts#L48)

A short code identifying the kind of error, e.g. `'NotFoundError'`.

***

### errors

```ts
errors: ApiError[];
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:52](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/error.ts#L52)

The {json:api} formatted errors associated with the request.

***

### isAdapterError

```ts
isAdapterError: true;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:44](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/error.ts#L44)

A property signifying that an Error uses the AdapterRequestError interface.
