---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/utilities/handlers/classes/AutoCompress.md
description: >-
  Request handler that compresses large `POST`, `PUT`, `PATCH`, and `DELETE`
  bodies with `CompressionStream`, optionally streaming them.
---

# &#x20;AutoCompress&#x20;

Defined in: [-private/handlers/auto-compress.ts:190](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L190)

A request handler that automatically compresses the request body
if the request body is a string, array buffer, blob, or form data.

This uses the [CompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)

The compression format as well as the kinds of data to compress can be
configured using the `format` and `constraints` options.

```diff
+import { AutoCompress } from '@ember-data/request-utils/handlers';
import Fetch from '@ember-data/request/fetch';
import RequestManager from '@ember-data/request';
import Store from '@ember-data/store';

class AppStore extends Store {
  requestManager = new RequestManager()
    .use([
+       new AutoCompress(),
       Fetch
    ]);
}
```

## Implements

* `Handler`

## Constructors

### Constructor

```ts
new AutoCompress(options?: CompressionOptions): AutoCompress;
```

Defined in: [-private/handlers/auto-compress.ts:202](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L202)

#### Parameters

##### options?

`CompressionOptions` = `{}`

#### Returns

`AutoCompress`

## Methods

### request()

```ts
request<T>(__namedParameters: RequestContext, next: NextFn<T>): 
  | Promise<T>
| Future<T>;
```

Defined in: [-private/handlers/auto-compress.ts:212](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L212)

Method to implement to handle requests. Receives the request
context and a nextFn to call to pass-along the request to
other handlers.

#### Type Parameters

##### T

`T`

#### Parameters

##### \_\_namedParameters

`RequestContext`

##### next

`NextFn`<`T`>

#### Returns

| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>
| `Future`<`T`>

#### Implementation of

```ts
Handler.request
```

## Properties

### options

```ts
options: Required<CompressionOptions> & {
  constraints: Required<Constraints>;
};
```

Defined in: [-private/handlers/auto-compress.ts:195](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L195)

The resolved options this handler was configured with, with all
defaults (including `constraints` defaults) applied.

#### Type Declaration

##### constraints

```ts
constraints: Required<Constraints>;
```

The resolved size constraints used to decide whether to compress a given request body.
