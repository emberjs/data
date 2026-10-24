---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/request/types/StructuredDataDocument.md
description: >-
  The `{ request, response, content }` object that a request's `Future` resolves
  with when the request succeeds.
---

# &#x20;StructuredDataDocument\<T>

```ts
interface StructuredDataDocument<T> {
  content: T;
  request: ImmutableRequestInfo;
  response: 
  | Response
  | ResponseInfo
  | null;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:500](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L500)

When a [Future](../../../request/types/Future.md) resolves, it returns an object
containing the original [request](RequestInfo.md),
the [response](https://developer.mozilla.org/docs/Web/API/Response) set by the handler chain (if any), and
the processed content.

## Type Parameters

### T

`T`

## Properties

### content

```ts
content: T;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:516](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L516)

the processed content of the response

***

### request

```ts
request: ImmutableRequestInfo;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:508](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L508)

#### See

[ImmutableRequestInfo](ImmutableRequestInfo.md)

***

### response

```ts
response: 
  | Response
  | ResponseInfo
  | null;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:512](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L512)

the response set by the handler chain, if any
