---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/request/functions/withReactiveResponse.md
---

# &#x20;withReactiveResponse()

```ts
function withReactiveResponse<T, M extends ObjectValue | undefined = ObjectValue | undefined, E extends object = object, EM extends ObjectValue | undefined = M>(obj: RequestInfo): RequestInfo<ReactiveDataDocument<T, M, E, EM>> & {
  ___(unique) Symbol(RequestSignature): ReactiveDataDocument<T, M, E, EM>;
};
```

Defined in: [warp-drive-packages/core/src/request.ts:74](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request.ts#L74)

Brands the supplied object with the supplied response type
wrapped in [ReactiveDataDocument](../../reactive/types/ReactiveDataDocument.md). This is a convenience for
the common case of using [withResponseType](withResponseType.md) with `ReactiveDataDocument`.

```ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/user.ts'

const result = await store.request(
  withReactiveResponse<User>({ url: '/users/1' })
);

result.content.data; // will have type User
```

Pass a second type param to declare the `meta` the endpoint returns:

```ts
type PageMeta = { page: { limit: number; offset: number }; total?: number };

const result = await store.request(
  withReactiveResponse<User[], PageMeta>({ url: '/users' })
);

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
