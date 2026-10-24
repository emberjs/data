---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/request/functions/withReactiveResponse.md
description: >-
  Types a request object so its response resolves as a `ReactiveDataDocument` of
  the given data and meta types; no runtime effect.
---

# &#x20;withReactiveResponse()

```ts
function withReactiveResponse<T, M extends ObjectValue | undefined = ObjectValue | undefined, E extends object = object, EM extends ObjectValue | undefined = M>(obj: RequestInfo): RequestInfo<ReactiveDataDocument<T, M, E, EM>> & {
  ___(unique) Symbol(RequestSignature): ReactiveDataDocument<T, M, E, EM>;
};
```

Defined in: [warp-drive-packages/core/src/request.ts:103](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/request.ts#L103)

Brands the supplied object with the supplied response type
wrapped in [ReactiveDataDocument](../../reactive/types/ReactiveDataDocument.md). This is a convenience for
the common case of using [withResponseType](withResponseType.md) with `ReactiveDataDocument`.

Like `withResponseType`, call it inside a [builder](/guides/the-manual/requests/builders)
rather than where the request is made. The
[Typing Requests](/guides/the-manual/requests/typing-requests#typing-reactive-responses)
guide shows how to use it.

```ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/user.ts'

export function getUser(id: string) {
  return withReactiveResponse<User>({ url: `/users/${id}` });
}

const result = await store.request(getUser('1'));

result.content.data; // will have type User
```

Pass a second type param to declare the `meta` the endpoint returns:

```ts
type PageMeta = { page: { limit: number; offset: number }; total?: number };

export function getUsers() {
  return withReactiveResponse<User[], PageMeta>({ url: '/users' });
}

const result = await store.request(getUsers());

result.content.meta?.total; // number | undefined
```

## Type Parameters

### T

`T`

### M

`M` *extends* [`ObjectValue`](../../types/json/raw/types/ObjectValue.md) | `undefined` = [`ObjectValue`](../../types/json/raw/types/ObjectValue.md) | `undefined`

### E

`E` *extends* `object` = `object`

### EM

`EM` *extends* [`ObjectValue`](../../types/json/raw/types/ObjectValue.md) | `undefined` = `M`

## Parameters

### obj

[`RequestInfo`](../../types/request/types/RequestInfo.md)

## Returns
