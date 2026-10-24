---
url: /pr-preview/pr-11154/api/@warp-drive/core/request/types/Future.md
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

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:68](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/request/-private/types.ts#L68)

A Future is a [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) which resolves or rejects with a [StructuredDocument](../../types/request/types/StructuredDocument.md)
while providing the ability to [abort](#abort) the underlying request, and
[access the response stream](#getstream) before the outer promise resolves;

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

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:83](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/request/-private/types.ts#L83)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1562](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1562)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2018.promise.d.ts:27](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2018.promise.d.ts#L27)

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

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:92](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/request/-private/types.ts#L92)

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

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:100](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/request/-private/types.ts#L100)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1555](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1555)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:174](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts#L174)

#### Inherited from

```ts
Promise.[toStringTag]
```

***

### id

```ts
id: number;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:115](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/request/-private/types.ts#L115)

The id of the associated request, if any, as assigned
by the RequestManager

This is not unique across Manager instances and cannot
be used to identify or dedupe requests.

***

### lid

```ts
lid: RequestKey | null;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:106](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/request/-private/types.ts#L106)

The identifier of the associated request, if any, as
assigned by the CacheHandler.
