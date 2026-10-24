---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/adapter/rest/types/FetchRequestInit.md
---

&#x20;

# &#x20;FetchRequestInit

```ts
interface FetchRequestInit extends RequestInit {
  method: HTTPMethod;
  type: HTTPMethod;
  url: string;
}
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:64](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/adapter/rest.ts#L64)

The options passed to the native `fetch` API by RESTAdapter.\_fetchRequest | \_fetchRequest.

## Extends

* `RequestInit`

## Properties

### method

```ts
method: HTTPMethod;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:72](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/adapter/rest.ts#L72)

the HTTP method to use

#### Overrides

```ts
RequestInit.method
```

***

### type

```ts
type: HTTPMethod;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:76](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/adapter/rest.ts#L76)

the HTTP method to use, duplicated for jQuery/fetch option compatibility

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:68](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/adapter/rest.ts#L68)

the url to request
