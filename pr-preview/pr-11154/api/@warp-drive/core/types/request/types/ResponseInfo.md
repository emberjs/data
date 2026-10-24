---
url: /pr-preview/pr-11154/api/@warp-drive/core/types/request/types/ResponseInfo.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:728](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L728)

An immutable, JSON-serializable subset of the native [Response](https://developer.mozilla.org/docs/Web/API/Response)
interface.

## Properties

### headers

```ts
readonly headers: ImmutableHeaders;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:732](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L732)

see [ImmutableHeaders](ImmutableHeaders.md)

***

### ok

```ts
readonly ok: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:736](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L736)

whether the response's status code was in the 200-299 range

***

### redirected

```ts
readonly redirected: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:740](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L740)

whether the response is the result of a redirect

***

### status

```ts
readonly status: number;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:744](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L744)

the response's HTTP status code

***

### statusText

```ts
readonly statusText: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:748](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L748)

the status message associated with the response's status code

***

### type

```ts
readonly type: ResponseType;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:752](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L752)

the type of the response, see [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/type)

***

### url

```ts
readonly url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:756](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/request.ts#L756)

the url of the response
