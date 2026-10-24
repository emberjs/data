---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/request/types/ConstrainedRequestOptions.md
description: >-
  Options the request builders accept to set reload behavior and override the
  url's host, namespace, resource path, and query param serialization.
---

# &#x20;ConstrainedRequestOptions

```ts
interface ConstrainedRequestOptions {
  backgroundReload?: boolean;
  host?: string;
  namespace?: string;
  reload?: boolean;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:446](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/request.ts#L446)

Options accepted by the request builders for constraining how a
request's url is constructed and how the request interacts with the cache.

## Extended by

* [`FindRecordOptions`](FindRecordOptions.md)

## Properties

### backgroundReload?

```ts
optional backgroundReload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:456](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/request.ts#L456)

If true, and a cached response is present and not expired, the request
will be made in the background and the cached response will be returned.

***

### host?

```ts
optional host?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:461](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/request.ts#L461)

The host to use when constructing the request's url, overriding any
host configured via `setBuildURLConfig`.

***

### namespace?

```ts
optional namespace?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:466](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/request.ts#L466)

The namespace to use when constructing the request's url, overriding
any namespace configured via `setBuildURLConfig`.

***

### reload?

```ts
optional reload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:451](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/request.ts#L451)

If true, the request will be made even if a cached response is present
and not expired.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:471](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/request.ts#L471)

The resource path to use when constructing the request's url,
overriding the default of pluralizing the resource's type.

***

### urlParamsSettings?

```ts
optional urlParamsSettings?: QueryParamsSerializationOptions;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:475](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/request.ts#L475)

Options for how to serialize the request's query params, see [QueryParamsSerializationOptions](../../params/types/QueryParamsSerializationOptions.md).
