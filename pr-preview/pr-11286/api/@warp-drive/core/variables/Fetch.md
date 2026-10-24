---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/variables/Fetch.md
---

# &#x20;Fetch

```ts
const Fetch: {
  request: Promise<T>;
};
```

Defined in: [warp-drive-packages/core/src/request/-private/fetch.ts:134](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/request/-private/fetch.ts#L134)

```ts
import { Fetch } from '@warp-drive/core';
```

A basic Fetch Handler which converts a request into a
`fetch` call presuming the response to be `json`.

```ts
import { RequestManager, Fetch } from '@warp-drive/core';

const manager = new RequestManager()
  .use([Fetch]);
```

## Type Declaration

### request()

```ts
request<T>(context: Context): Promise<T>;
```

Issues the request via native `fetch`, setting the response and
(when requested) streaming the decoded body via [Context.setStream](../request/types/Context.md#setstream)
as it downloads, then resolves with the parsed JSON body.

#### Type Parameters

##### T

`T`

#### Parameters

##### context

[`Context`](../request/types/Context.md)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>
