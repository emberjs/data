---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/holodeck/classes/MockServerHandler.md
description: >-
  RequestManager handler that routes requests to the Holodeck mock server by
  tagging each url with the test id and request count.
---

# &#x20;MockServerHandler

Defined in: [index.ts:283](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/packages/holodeck/src/index.ts#L283)

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

Defined in: [index.ts:285](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/packages/holodeck/src/index.ts#L285)

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

Defined in: [index.ts:288](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/packages/holodeck/src/index.ts#L288)

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

Defined in: [index.ts:284](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/packages/holodeck/src/index.ts#L284)
