---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/legacy/adapter/rest/types/RequestData.md
description: >-
  The url and HTTP method of a legacy `RESTAdapter` request, used to build error
  messages when that request fails.
---

&#x20;

# &#x20;RequestData

```ts
type RequestData = {
  [key: string]: unknown;
  method: HTTPMethod;
  url: string;
};
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:118](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/adapter/rest.ts#L118)

A minimal description of an in-flight request, used for building
error messages when a request fails.

## Indexable

```ts
[key: string]: unknown
```

## Properties

### method

```ts
method: HTTPMethod;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:126](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/adapter/rest.ts#L126)

the HTTP method that was used

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:122](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/adapter/rest.ts#L122)

the url that was requested
