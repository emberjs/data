---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/request/types/FindRecordOptions.md
description: >-
  Options the `findRecord` request builders accept: the shared url and reload
  options plus the relationship paths to `include`.
---

# &#x20;FindRecordOptions

```ts
interface FindRecordOptions extends ConstrainedRequestOptions {
  backgroundReload?: boolean;
  host?: string;
  include?: string | string[];
  namespace?: string;
  reload?: boolean;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:484](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L484)

Options accepted by the `findRecord` request builders.

## Extends

* [`ConstrainedRequestOptions`](ConstrainedRequestOptions.md)

## Properties

### backgroundReload?

```ts
optional backgroundReload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:456](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L456)

If true, and a cached response is present and not expired, the request
will be made in the background and the cached response will be returned.

#### Inherited from

[`ConstrainedRequestOptions`](ConstrainedRequestOptions.md).[`backgroundReload`](ConstrainedRequestOptions.md#backgroundreload)

***

### host?

```ts
optional host?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:461](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L461)

The host to use when constructing the request's url, overriding any
host configured via `setBuildURLConfig`.

#### Inherited from

[`ConstrainedRequestOptions`](ConstrainedRequestOptions.md).[`host`](ConstrainedRequestOptions.md#host)

***

### include?

```ts
optional include?: string | string[];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:488](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L488)

the relationship paths to sideload, see [Includes](../../record/types/Includes.md)

***

### namespace?

```ts
optional namespace?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:466](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L466)

The namespace to use when constructing the request's url, overriding
any namespace configured via `setBuildURLConfig`.

#### Inherited from

[`ConstrainedRequestOptions`](ConstrainedRequestOptions.md).[`namespace`](ConstrainedRequestOptions.md#namespace)

***

### reload?

```ts
optional reload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:451](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L451)

If true, the request will be made even if a cached response is present
and not expired.

#### Inherited from

[`ConstrainedRequestOptions`](ConstrainedRequestOptions.md).[`reload`](ConstrainedRequestOptions.md#reload)

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:471](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L471)

The resource path to use when constructing the request's url,
overriding the default of pluralizing the resource's type.

#### Inherited from

[`ConstrainedRequestOptions`](ConstrainedRequestOptions.md).[`resourcePath`](ConstrainedRequestOptions.md#resourcepath)

***

### urlParamsSettings?

```ts
optional urlParamsSettings?: QueryParamsSerializationOptions;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:475](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/types/request.ts#L475)

Options for how to serialize the request's query params, see [QueryParamsSerializationOptions](../../params/types/QueryParamsSerializationOptions.md).

#### Inherited from

[`ConstrainedRequestOptions`](ConstrainedRequestOptions.md).[`urlParamsSettings`](ConstrainedRequestOptions.md#urlparamssettings)
