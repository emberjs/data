---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/utilities/handlers/classes/Gate.md
---

# &#x20;Gate

Defined in: [-private/handlers/gated.ts:15](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/-private/handlers/gated.ts#L15)

## Implements

* `Handler`

## Constructors

### Constructor

```ts
new Gate(handler: Handler, checkFn: CheckFn): Gate;
```

Defined in: [-private/handlers/gated.ts:25](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/-private/handlers/gated.ts#L25)

#### Parameters

##### handler

`Handler`

##### checkFn

`CheckFn`

#### Returns

`Gate`

## Methods

### request()

```ts
request<T = unknown>(context: RequestContext, next: NextFn<T>): 
  | Promise<T | StructuredDataDocument<T>>
| Future<T>;
```

Defined in: [-private/handlers/gated.ts:30](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/-private/handlers/gated.ts#L30)

Method to implement to handle requests. Receives the request
context and a nextFn to call to pass-along the request to
other handlers.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### context

`RequestContext`

##### next

`NextFn`<`T`>

#### Returns

| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T` | `StructuredDataDocument`<`T`>>
| `Future`<`T`>

#### Implementation of

```ts
Handler.request
```

## Properties

### checkFn

```ts
checkFn: CheckFn;
```

Defined in: [-private/handlers/gated.ts:23](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/-private/handlers/gated.ts#L23)

The predicate used to decide whether [handler](#handler) should run for a given request.

***

### handler

```ts
handler: Handler;
```

Defined in: [-private/handlers/gated.ts:19](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/-private/handlers/gated.ts#L19)

The wrapped handler to invoke when [checkFn](#checkfn) returns `true`.
