---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/variables/Fetch.md
description: >-
  Terminal request handler that sends the request with native `fetch` and
  resolves with the parsed JSON body, turning HTTP failures into errors.
---

# &#x20;Fetch

```ts
const Fetch: {
  request: Promise<T>;
};
```

Defined in: [warp-drive-packages/core/src/request/-private/fetch.ts:139](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/request/-private/fetch.ts#L139)

```ts
import { Fetch } from '@warp-drive/core';
```

A basic Fetch Handler which converts a request into a
`fetch` call presuming the response to be `json`.

The [Making Requests](/guides/the-manual/requests/#requests-do-not-need-to-use-fetch)
guide shows where it sits in the handler chain.

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
