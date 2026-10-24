---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/request/types/FetchError.md
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

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:117](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request/-private/utils.ts#L117)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11354](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11354)

#### Inherited from

```ts
DOMException.ABORT_ERR
```

***

### cause?

```ts
optional cause?: unknown;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:24](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2022.error.d.ts#L24)

#### Inherited from

```ts
DOMException.cause
```

***

### code

```ts
code: number;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:123](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request/-private/utils.ts#L123)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11359](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11359)

#### Inherited from

```ts
DOMException.DATA_CLONE_ERR
```

***

### DOMSTRING\_SIZE\_ERR

```ts
readonly DOMSTRING_SIZE_ERR: 2;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11336](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11336)

#### Inherited from

```ts
DOMException.DOMSTRING_SIZE_ERR
```

***

### HIERARCHY\_REQUEST\_ERR

```ts
readonly HIERARCHY_REQUEST_ERR: 3;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11337](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11337)

#### Inherited from

```ts
DOMException.HIERARCHY_REQUEST_ERR
```

***

### INDEX\_SIZE\_ERR

```ts
readonly INDEX_SIZE_ERR: 1;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11335](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11335)

#### Inherited from

```ts
DOMException.INDEX_SIZE_ERR
```

***

### INUSE\_ATTRIBUTE\_ERR

```ts
readonly INUSE_ATTRIBUTE_ERR: 10;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11344](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11344)

#### Inherited from

```ts
DOMException.INUSE_ATTRIBUTE_ERR
```

***

### INVALID\_ACCESS\_ERR

```ts
readonly INVALID_ACCESS_ERR: 15;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11349](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11349)

#### Inherited from

```ts
DOMException.INVALID_ACCESS_ERR
```

***

### INVALID\_CHARACTER\_ERR

```ts
readonly INVALID_CHARACTER_ERR: 5;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11339](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11339)

#### Inherited from

```ts
DOMException.INVALID_CHARACTER_ERR
```

***

### INVALID\_MODIFICATION\_ERR

```ts
readonly INVALID_MODIFICATION_ERR: 13;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11347](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11347)

#### Inherited from

```ts
DOMException.INVALID_MODIFICATION_ERR
```

***

### INVALID\_NODE\_TYPE\_ERR

```ts
readonly INVALID_NODE_TYPE_ERR: 24;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11358](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11358)

#### Inherited from

```ts
DOMException.INVALID_NODE_TYPE_ERR
```

***

### INVALID\_STATE\_ERR

```ts
readonly INVALID_STATE_ERR: 11;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11345](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11345)

#### Inherited from

```ts
DOMException.INVALID_STATE_ERR
```

***

### isRequestError

```ts
isRequestError: true;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:153](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request/-private/utils.ts#L153)

A property signifying that an Error uses the FetchError
interface.

***

### message

```ts
readonly message: string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11328](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11328)

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

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:131](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request/-private/utils.ts#L131)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11348](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11348)

#### Inherited from

```ts
DOMException.NAMESPACE_ERR
```

***

### NETWORK\_ERR

```ts
readonly NETWORK_ERR: 19;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11353](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11353)

#### Inherited from

```ts
DOMException.NETWORK_ERR
```

***

### NO\_DATA\_ALLOWED\_ERR

```ts
readonly NO_DATA_ALLOWED_ERR: 6;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11340](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11340)

#### Inherited from

```ts
DOMException.NO_DATA_ALLOWED_ERR
```

***

### NO\_MODIFICATION\_ALLOWED\_ERR

```ts
readonly NO_MODIFICATION_ALLOWED_ERR: 7;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11341](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11341)

#### Inherited from

```ts
DOMException.NO_MODIFICATION_ALLOWED_ERR
```

***

### NOT\_FOUND\_ERR

```ts
readonly NOT_FOUND_ERR: 8;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11342](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11342)

#### Inherited from

```ts
DOMException.NOT_FOUND_ERR
```

***

### NOT\_SUPPORTED\_ERR

```ts
readonly NOT_SUPPORTED_ERR: 9;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11343](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11343)

#### Inherited from

```ts
DOMException.NOT_SUPPORTED_ERR
```

***

### QUOTA\_EXCEEDED\_ERR

```ts
readonly QUOTA_EXCEEDED_ERR: 22;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11356](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11356)

#### Inherited from

```ts
DOMException.QUOTA_EXCEEDED_ERR
```

***

### SECURITY\_ERR

```ts
readonly SECURITY_ERR: 18;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11352](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11352)

#### Inherited from

```ts
DOMException.SECURITY_ERR
```

***

### stack?

```ts
optional stack?: string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1076](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1076)

#### Inherited from

```ts
DOMException.stack
```

***

### status

```ts
status: number;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:140](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request/-private/utils.ts#L140)

The http status code associated to the returned error.

Browser/System level network errors will often have an error code of `0` or `5`.
Aborted requests will have an error code of `20`.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/status)

***

### statusText

```ts
statusText: string;
```

Defined in: [warp-drive-packages/core/src/request/-private/utils.ts:148](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request/-private/utils.ts#L148)

The Status Text associated to the [status code](#status)
for the error.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/statusText)

***

### SYNTAX\_ERR

```ts
readonly SYNTAX_ERR: 12;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11346](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11346)

#### Inherited from

```ts
DOMException.SYNTAX_ERR
```

***

### TIMEOUT\_ERR

```ts
readonly TIMEOUT_ERR: 23;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11357](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11357)

#### Inherited from

```ts
DOMException.TIMEOUT_ERR
```

***

### TYPE\_MISMATCH\_ERR

```ts
readonly TYPE_MISMATCH_ERR: 17;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11351](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11351)

#### Inherited from

```ts
DOMException.TYPE_MISMATCH_ERR
```

***

### URL\_MISMATCH\_ERR

```ts
readonly URL_MISMATCH_ERR: 21;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11355](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11355)

#### Inherited from

```ts
DOMException.URL_MISMATCH_ERR
```

***

### VALIDATION\_ERR

```ts
readonly VALIDATION_ERR: 16;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11350](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11350)

#### Inherited from

```ts
DOMException.VALIDATION_ERR
```

***

### WRONG\_DOCUMENT\_ERR

```ts
readonly WRONG_DOCUMENT_ERR: 4;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.dom.d.ts:11338](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts#L11338)

#### Inherited from

```ts
DOMException.WRONG_DOCUMENT_ERR
```
