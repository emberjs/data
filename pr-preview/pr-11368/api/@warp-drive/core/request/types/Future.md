---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/request/types/Future.md
description: >-
  The promise returned for every request, resolving with the response document
  and able to abort the request or expose its response stream early.
---

# &#x20;Future\<T>

```ts
interface Future<T> extends Promise<StructuredDataDocument<T>> {
  readonly [toStringTag]: string;
  id: number;
  lid: RequestKey | null;
  abort(reason?: string): void;
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): Promise<
  | StructuredDataDocument<T>
  | TResult>;
  finally(onfinally?: (() => void) | null): Promise<StructuredDataDocument<T>>;
  getStream(): Promise<
  | ReadableStream<any>
  | null>;
  onFinalize(cb: () => void): void;
  then<TResult1 = StructuredDataDocument<T>, TResult2 = never>(onfulfilled?: 
  | ((value: StructuredDataDocument) => TResult1 | PromiseLike<TResult1>)
  | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2>;
}
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:77](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/request/-private/types.ts#L77)

A Future is a [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) which resolves or rejects with a [StructuredDocument](../../types/request/types/StructuredDocument.md)
while providing the ability to [abort](#abort) the underlying request, and
[access the response stream](#getstream) before the outer promise resolves;

The [Using The Response](/guides/the-manual/requests/using-the-response) guide shows
how to work with one.

## Extends

* [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`StructuredDataDocument`](../../types/request/types/StructuredDataDocument.md)<`T`>>

## Type Parameters

### T

`T`

## Methods

### abort()

```ts
abort(reason?: string): void;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:92](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/request/-private/types.ts#L92)

Cancel this request by firing the [AbortController](https://developer.mozilla.org/docs/Web/API/AbortController)'s signal.

This method can be used as an action or event handler as its
context is bound to the Future instance.

#### Parameters

##### reason?

`string`

optional reason for aborting the request

#### Returns

`void`

***

### catch()

```ts
catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): Promise<
  | StructuredDataDocument<T>
| TResult>;
```

Attaches a callback for only the rejection of the Promise.

#### Type Parameters

##### TResult

`TResult` = `never`

#### Parameters

##### onrejected?

((`reason`: `any`) => `TResult` | `PromiseLike`<`TResult`>) | `null`

The callback to execute when the Promise is rejected.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<
| [`StructuredDataDocument`](../../types/request/types/StructuredDataDocument.md)<`T`>
| `TResult`>

A Promise for the completion of the callback.

#### Inherited from

```ts
Promise.catch
```

***

### finally()

```ts
finally(onfinally?: (() => void) | null): Promise<StructuredDataDocument<T>>;
```

Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
resolved value cannot be modified from the callback.

#### Parameters

##### onfinally?

(() => `void`) | `null`

The callback to execute when the Promise is settled (fulfilled or rejected).

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`StructuredDataDocument`](../../types/request/types/StructuredDataDocument.md)<`T`>>

A Promise for the completion of the callback.

#### Inherited from

```ts
Promise.finally
```

***

### getStream()

```ts
getStream(): Promise<
  | ReadableStream<any>
| null>;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:101](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/request/-private/types.ts#L101)

Get the response stream, if any, once made available.

This method can be used as an action or event handler as its
context is bound to the Future instance.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<
| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`any`>
| `null`>

***

### onFinalize()

```ts
onFinalize(cb: () => void): void;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:109](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/request/-private/types.ts#L109)

Run a callback when this request completes. Use sparingly,
mostly useful for instrumentation and infrastructure.

#### Parameters

##### cb

() => `void`

the callback to run

#### Returns

`void`

***

### then()

```ts
then<TResult1 = StructuredDataDocument<T>, TResult2 = never>(onfulfilled?: 
  | ((value: StructuredDataDocument) => TResult1 | PromiseLike<TResult1>)
| null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2>;
```

Attaches callbacks for the resolution and/or rejection of the Promise.

#### Type Parameters

##### TResult1

`TResult1` = [`StructuredDataDocument`](../../types/request/types/StructuredDataDocument.md)<`T`>

##### TResult2

`TResult2` = `never`

#### Parameters

##### onfulfilled?

| ((`value`: [`StructuredDataDocument`](../../types/request/types/StructuredDataDocument.md)) => `TResult1` | `PromiseLike`<`TResult1`>)
| `null`

The callback to execute when the Promise is resolved.

##### onrejected?

((`reason`: `any`) => `TResult2` | `PromiseLike`<`TResult2`>) | `null`

The callback to execute when the Promise is rejected.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`TResult1` | `TResult2`>

A Promise for the completion of which ever callback is executed.

#### Inherited from

```ts
Promise.then
```

## Properties

### \[toStringTag]

```ts
readonly [toStringTag]: string;
```

#### Inherited from

```ts
Promise.[toStringTag]
```

***

### id

```ts
id: number;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:124](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/request/-private/types.ts#L124)

The id of the associated request, if any, as assigned
by the RequestManager

This is not unique across Manager instances and cannot
be used to identify or dedupe requests.

***

### lid

```ts
lid: RequestKey | null;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:115](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/request/-private/types.ts#L115)

The identifier of the associated request, if any, as
assigned by the CacheHandler.
