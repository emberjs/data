---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/legacy/adapter/rest/types/JQueryRequestInit.md
description: >-
  jQuery `$.ajax` settings plus `url`, `method`, and `type` that the legacy
  `RESTAdapter` builds when it sends a request through jQuery.
---

&#x20;

# &#x20;JQueryRequestInit

```ts
interface JQueryRequestInit extends JQueryAjaxSettings {
  method: HTTPMethod;
  type: HTTPMethod;
  url: string;
}
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:96](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/legacy/src/adapter/rest.ts#L96)

The options passed to jQuery's `$.ajax` by RESTAdapter.\_ajaxRequest | \_ajaxRequest.

## Extends

* `JQueryAjaxSettings`

## Properties

### method

```ts
method: HTTPMethod;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:104](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/legacy/src/adapter/rest.ts#L104)

the HTTP method to use

#### Overrides

```ts
JQueryAjaxSettings.method
```

***

### type

```ts
type: HTTPMethod;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:108](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/legacy/src/adapter/rest.ts#L108)

the HTTP method to use, duplicated for jQuery/fetch option compatibility

#### Overrides

```ts
JQueryAjaxSettings.type
```

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:100](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/legacy/src/adapter/rest.ts#L100)

the url to request

#### Overrides

```ts
JQueryAjaxSettings.url
```
