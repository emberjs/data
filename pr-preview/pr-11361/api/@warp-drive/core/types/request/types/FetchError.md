---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/types/request/types/FetchError.md
description: >-
  The shape of errors thrown by the Fetch handler for failed, aborted, or
  network-errored requests, carrying the HTTP `status` and `statusText`.
---

# &#x20;FetchError

```ts
interface FetchError extends DOMException {
  readonly ABORT_ERR: 20;
  cause?: unknown;
  code: number;
  readonly DATA_CLONE_ERR: 25;
  readonly DOMSTRING_SIZE_ERR: 2;
  readonly HIERARCHY_REQUEST_ERR: 3;
  readonly INDEX_SIZE_ERR: 1;
  readonly INUSE_ATTRIBUTE_ERR: 10;
  readonly INVALID_ACCESS_ERR: 15;
  readonly INVALID_CHARACTER_ERR: 5;
  readonly INVALID_MODIFICATION_ERR: 13;
  readonly INVALID_NODE_TYPE_ERR: 24;
  readonly INVALID_STATE_ERR: 11;
  isRequestError: true;
  readonly message: string;
  name: string;
  readonly NAMESPACE_ERR: 14;
  readonly NETWORK_ERR: 19;
  readonly NO_DATA_ALLOWED_ERR: 6;
  readonly NO_MODIFICATION_ALLOWED_ERR: 7;
  readonly NOT_FOUND_ERR: 8;
  readonly NOT_SUPPORTED_ERR: 9;
  readonly QUOTA_EXCEEDED_ERR: 22;
  readonly SECURITY_ERR: 18;
  stack?: string;
  status: number;
  statusText: string;
  readonly SYNTAX_ERR: 12;
  readonly TIMEOUT_ERR: 23;
  readonly TYPE_MISMATCH_ERR: 17;
  readonly URL_MISMATCH_ERR: 21;
  readonly VALIDATION_ERR: 16;
  readonly WRONG_DOCUMENT_ERR: 4;
}
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:120](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/request/-private/utils.ts#L120)

Additional properties exposed on errors thrown by the
[Fetch Handler](../../../variables/Fetch.md).

In the case of an Abort or system/browser level issue,
this extends [DOMException](https://developer.mozilla.org/docs/Web/API/DOMException).

Else it extends from [AggregateError](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/AggregateError) if the
response includes an array of errors, falling back
to [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) as its base.

## Extends

* [`DOMException`](https://developer.mozilla.org/docs/Web/API/DOMException)

## Properties

### ABORT\_ERR

```ts
readonly ABORT_ERR: 20;
```

#### Inherited from

```ts
DOMException.ABORT_ERR
```

***

### cause?

```ts
optional cause?: unknown;
```

#### Inherited from

```ts
DOMException.cause
```

***

### code

```ts
code: number;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:126](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/request/-private/utils.ts#L126)

Alias for [status](#status).

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/status)

#### Overrides

```ts
DOMException.code
```

***

### DATA\_CLONE\_ERR

```ts
readonly DATA_CLONE_ERR: 25;
```

#### Inherited from

```ts
DOMException.DATA_CLONE_ERR
```

***

### DOMSTRING\_SIZE\_ERR

```ts
readonly DOMSTRING_SIZE_ERR: 2;
```

#### Inherited from

```ts
DOMException.DOMSTRING_SIZE_ERR
```

***

### HIERARCHY\_REQUEST\_ERR

```ts
readonly HIERARCHY_REQUEST_ERR: 3;
```

#### Inherited from

```ts
DOMException.HIERARCHY_REQUEST_ERR
```

***

### INDEX\_SIZE\_ERR

```ts
readonly INDEX_SIZE_ERR: 1;
```

#### Inherited from

```ts
DOMException.INDEX_SIZE_ERR
```

***

### INUSE\_ATTRIBUTE\_ERR

```ts
readonly INUSE_ATTRIBUTE_ERR: 10;
```

#### Inherited from

```ts
DOMException.INUSE_ATTRIBUTE_ERR
```

***

### INVALID\_ACCESS\_ERR

```ts
readonly INVALID_ACCESS_ERR: 15;
```

#### Inherited from

```ts
DOMException.INVALID_ACCESS_ERR
```

***

### INVALID\_CHARACTER\_ERR

```ts
readonly INVALID_CHARACTER_ERR: 5;
```

#### Inherited from

```ts
DOMException.INVALID_CHARACTER_ERR
```

***

### INVALID\_MODIFICATION\_ERR

```ts
readonly INVALID_MODIFICATION_ERR: 13;
```

#### Inherited from

```ts
DOMException.INVALID_MODIFICATION_ERR
```

***

### INVALID\_NODE\_TYPE\_ERR

```ts
readonly INVALID_NODE_TYPE_ERR: 24;
```

#### Inherited from

```ts
DOMException.INVALID_NODE_TYPE_ERR
```

***

### INVALID\_STATE\_ERR

```ts
readonly INVALID_STATE_ERR: 11;
```

#### Inherited from

```ts
DOMException.INVALID_STATE_ERR
```

***

### isRequestError

```ts
isRequestError: true;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:156](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/request/-private/utils.ts#L156)

A property signifying that an Error uses the FetchError
interface.

***

### message

```ts
readonly message: string;
```

The **`message`** read-only property of the DOMException interface returns a string representing a message or description associated with the given error name.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMException/message)

#### Inherited from

```ts
DOMException.message
```

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:134](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/request/-private/utils.ts#L134)

The name associated to the [status code](#status).

Typically this will be of the formula `StatusTextError` for instance
a 404 status with status text of `Not Found` would have the name
`NotFoundError`.

#### Overrides

```ts
DOMException.name
```

***

### NAMESPACE\_ERR

```ts
readonly NAMESPACE_ERR: 14;
```

#### Inherited from

```ts
DOMException.NAMESPACE_ERR
```

***

### NETWORK\_ERR

```ts
readonly NETWORK_ERR: 19;
```

#### Inherited from

```ts
DOMException.NETWORK_ERR
```

***

### NO\_DATA\_ALLOWED\_ERR

```ts
readonly NO_DATA_ALLOWED_ERR: 6;
```

#### Inherited from

```ts
DOMException.NO_DATA_ALLOWED_ERR
```

***

### NO\_MODIFICATION\_ALLOWED\_ERR

```ts
readonly NO_MODIFICATION_ALLOWED_ERR: 7;
```

#### Inherited from

```ts
DOMException.NO_MODIFICATION_ALLOWED_ERR
```

***

### NOT\_FOUND\_ERR

```ts
readonly NOT_FOUND_ERR: 8;
```

#### Inherited from

```ts
DOMException.NOT_FOUND_ERR
```

***

### NOT\_SUPPORTED\_ERR

```ts
readonly NOT_SUPPORTED_ERR: 9;
```

#### Inherited from

```ts
DOMException.NOT_SUPPORTED_ERR
```

***

### QUOTA\_EXCEEDED\_ERR

```ts
readonly QUOTA_EXCEEDED_ERR: 22;
```

#### Inherited from

```ts
DOMException.QUOTA_EXCEEDED_ERR
```

***

### SECURITY\_ERR

```ts
readonly SECURITY_ERR: 18;
```

#### Inherited from

```ts
DOMException.SECURITY_ERR
```

***

### stack?

```ts
optional stack?: string;
```

#### Inherited from

```ts
DOMException.stack
```

***

### status

```ts
status: number;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:143](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/request/-private/utils.ts#L143)

The http status code associated to the returned error.

Browser/System level network errors will often have an error code of `0` or `5`.
Aborted requests will have an error code of `20`.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/status)

***

### statusText

```ts
statusText: string;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:151](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/request/-private/utils.ts#L151)

The Status Text associated to the [status code](#status)
for the error.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/statusText)

***

### SYNTAX\_ERR

```ts
readonly SYNTAX_ERR: 12;
```

#### Inherited from

```ts
DOMException.SYNTAX_ERR
```

***

### TIMEOUT\_ERR

```ts
readonly TIMEOUT_ERR: 23;
```

#### Inherited from

```ts
DOMException.TIMEOUT_ERR
```

***

### TYPE\_MISMATCH\_ERR

```ts
readonly TYPE_MISMATCH_ERR: 17;
```

#### Inherited from

```ts
DOMException.TYPE_MISMATCH_ERR
```

***

### URL\_MISMATCH\_ERR

```ts
readonly URL_MISMATCH_ERR: 21;
```

#### Inherited from

```ts
DOMException.URL_MISMATCH_ERR
```

***

### VALIDATION\_ERR

```ts
readonly VALIDATION_ERR: 16;
```

#### Inherited from

```ts
DOMException.VALIDATION_ERR
```

***

### WRONG\_DOCUMENT\_ERR

```ts
readonly WRONG_DOCUMENT_ERR: 4;
```

#### Inherited from

```ts
DOMException.WRONG_DOCUMENT_ERR
```
