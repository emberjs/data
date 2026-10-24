---
url: /pr-preview/pr-11154/api/@warp-drive/holodeck/classes/MockServerHandler.md
---

# &#x20;MockServerHandler

Defined in: [index.ts:209](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/packages/holodeck/src/index.ts#L209)

A request handler that intercepts requests and routes them through
the Holodeck mock server.

This handler modifies the request URL to include test identifiers
and manages request counts for accurate mocking.

Requires that the test context be configured with a testId using `setTestId`.

## Param

**owner**

the test context object used to retrieve the test ID.

## Implements

* `Handler`

## Constructors

### Constructor

```ts
new MockServerHandler(owner: object): MockServerHandler;
```

Defined in: [index.ts:211](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/packages/holodeck/src/index.ts#L211)

#### Parameters

##### owner

`object`

#### Returns

`MockServerHandler`

## Methods

### request()

```ts
request<T>(context: RequestContext, next: NextFn<T>): Promise<StructuredDataDocument<T>>;
```

Defined in: [index.ts:214](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/packages/holodeck/src/index.ts#L214)

Method to implement to handle requests. Receives the request
context and a nextFn to call to pass-along the request to
other handlers.

#### Type Parameters

##### T

`T`

#### Parameters

##### context

`RequestContext`

##### next

`NextFn`<`T`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`StructuredDataDocument`<`T`>>

#### Implementation of

```ts
Handler.request
```

## Properties

### owner

```ts
owner: object;
```

Defined in: [index.ts:210](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/packages/holodeck/src/index.ts#L210)
