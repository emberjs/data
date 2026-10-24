---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/request/types/ResponseInfo.md
description: >-
  Immutable, JSON-serializable snapshot of a fetch `Response`'s headers, status,
  url, and type, usable in place of a `Response` in request results.
---

# &#x20;ResponseInfo

```ts
interface ResponseInfo {
  readonly headers: ImmutableHeaders;
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
  readonly url: string;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:804](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L804)

An immutable, JSON-serializable subset of the native [Response](https://developer.mozilla.org/docs/Web/API/Response)
interface.

## Properties

### headers

```ts
readonly headers: ImmutableHeaders;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:808](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L808)

see [ImmutableHeaders](ImmutableHeaders.md)

***

### ok

```ts
readonly ok: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:812](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L812)

whether the response's status code was in the 200-299 range

***

### redirected

```ts
readonly redirected: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:816](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L816)

whether the response is the result of a redirect

***

### status

```ts
readonly status: number;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:820](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L820)

the response's HTTP status code

***

### statusText

```ts
readonly statusText: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:824](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L824)

the status message associated with the response's status code

***

### type

```ts
readonly type: ResponseType;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:828](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L828)

the type of the response, see [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/type)

***

### url

```ts
readonly url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:832](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L832)

the url of the response
