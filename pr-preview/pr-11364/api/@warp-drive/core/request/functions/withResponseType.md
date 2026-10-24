---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/request/functions/withResponseType.md
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

Defined in: [warp-drive-packages/core/src/request.ts:49](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/request.ts#L49)

Brands the supplied object with the supplied response type.

The [Typing Requests](/guides/the-manual/requests/typing-requests) guide shows how
to use it.

```ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request';
import type { User } from '#/data/user.ts'

const result = await store.request(
 withResponseType<ReactiveDataDocument<User>>({ url: '/users/1' })
);

result.content.data; // will have type User
```

## Type Parameters

### T

`T`

## Parameters

### obj

[`RequestInfo`](../../types/request/types/RequestInfo.md)

## Returns
