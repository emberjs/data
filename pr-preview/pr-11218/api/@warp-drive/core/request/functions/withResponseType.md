---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/core/request/functions/withResponseType.md
description: >-
  Types a request object with the response type that `store.request` or
  `RequestManager.request` should resolve with; no runtime effect.
---

# &#x20;withResponseType()

```ts
function withResponseType<T>(obj: RequestInfo): RequestInfo<T> & {
  ___(unique) Symbol(RequestSignature): T;
};
```

Defined in: [warp-drive-packages/core/src/request.ts:53](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/request.ts#L53)

Brands the supplied object with the supplied response type.

Call it inside a [builder](/guides/the-manual/requests/builders), so the type is part of
the builder's contract and every caller gets it through inference. Calling it inline
where the request is made is a cast. The [Typing Requests](/guides/the-manual/requests/typing-requests)
guide shows how to use it.

```ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request';
import type { User } from '#/data/user.ts'

export function getUser(id: string) {
  return withResponseType<ReactiveDataDocument<User>>({ url: `/users/${id}` });
}

const result = await store.request(getUser('1'));

result.content.data; // will have type User
```

## Type Parameters

### T

`T`

## Parameters

### obj

[`RequestInfo`](../../types/request/types/RequestInfo.md)

## Returns
