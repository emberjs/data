---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/request/functions/withResponseType.md
---

# &#x20;withResponseType()

```ts
function withResponseType<T>(obj: RequestInfo): RequestInfo<T> & {
  ___(unique) Symbol(RequestSignature): T;
};
```

Defined in: [warp-drive-packages/core/src/request.ts:35](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request.ts#L35)

Brands the supplied object with the supplied response type.

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
