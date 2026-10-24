---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/request/types/ConstrainedRequestOptions.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:397](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L397)

Options accepted by the request builders for constraining how a
request's url is constructed and how the request interacts with the cache.

## Extended by

* [`FindRecordOptions`](FindRecordOptions.md)

## Properties

### backgroundReload?

```ts
optional backgroundReload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:407](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L407)

If true, and a cached response is present and not expired, the request
will be made in the background and the cached response will be returned.

***

### host?

```ts
optional host?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:412](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L412)

The host to use when constructing the request's url, overriding any
host configured via `setBuildURLConfig`.

***

### namespace?

```ts
optional namespace?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:417](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L417)

The namespace to use when constructing the request's url, overriding
any namespace configured via `setBuildURLConfig`.

***

### reload?

```ts
optional reload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:402](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L402)

If true, the request will be made even if a cached response is present
and not expired.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:422](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L422)

The resource path to use when constructing the request's url,
overriding the default of pluralizing the resource's type.

***

### urlParamsSettings?

```ts
optional urlParamsSettings?: QueryParamsSerializationOptions;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:426](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L426)

Options for how to serialize the request's query params, see [QueryParamsSerializationOptions](../../params/types/QueryParamsSerializationOptions.md).
