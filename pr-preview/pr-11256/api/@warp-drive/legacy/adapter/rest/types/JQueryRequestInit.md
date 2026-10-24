---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/legacy/adapter/rest/types/JQueryRequestInit.md
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

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:96](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/legacy/src/adapter/rest.ts#L96)

The options passed to jQuery's `$.ajax` by RESTAdapter.\_ajaxRequest | \_ajaxRequest.

## Extends

* `JQueryAjaxSettings`

## Properties

### method

```ts
method: HTTPMethod;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:104](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/legacy/src/adapter/rest.ts#L104)

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

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:108](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/legacy/src/adapter/rest.ts#L108)

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

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:100](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/legacy/src/adapter/rest.ts#L100)

the url to request

#### Overrides

```ts
JQueryAjaxSettings.url
```
