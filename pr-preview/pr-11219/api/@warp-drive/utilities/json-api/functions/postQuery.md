---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/utilities/json-api/functions/postQuery.md
description: >-
  Builds a JSON:API `POST` request that sends a query as the JSON body, cached
  under a key built from the query params.
---

# &#x20;postQuery()

```ts
function postQuery<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = ApiError>(
   type: TypeFromInstance<T>, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): PostQueryRequestOptions<ReactiveDataDocument<T[], M, E>>;
function postQuery(
   type: string, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): PostQueryRequestOptions;
```

## Call Signature

```ts
function postQuery<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = ApiError>(
   type: TypeFromInstance<T>, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): PostQueryRequestOptions<ReactiveDataDocument<T[], M, E>>;
```

Defined in: [-private/json-api/query.ts:162](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/utilities/src/-private/json-api/query.ts#L162)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most JSON:API APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

The key difference between this and `query` is that this method will send the query
as the JSON body of a "POST" request instead of as query params in the url of a "GET"
request.

A CacheKey is generated from the url and query params, and used to cache the response
in the store.

```ts
import { postQuery } from '@warp-drive/utilities/json-api';

const options = postQuery('person', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**Supplying Options to Modify the Request Behavior**

The following options are supported:

* `host` - The host to use for the request, defaults to the `host` configured with `setBuildURLConfig`.
* `namespace` - The namespace to use for the request, defaults to the `namespace` configured with `setBuildURLConfig`.
* `resourcePath` - The resource path to use for the request, defaults to pluralizing the supplied type
* `reload` - Whether to forcibly reload the request if it is already in the store, not supplying this
  option will delegate to the store's CachePolicy, defaulting to `false` if none is configured.
* `backgroundReload` - Whether to reload the request if it is already in the store, but to also resolve the
  promise with the cached value, not supplying this option will delegate to the store's CachePolicy,
  defaulting to `false` if none is configured.
* `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { postQuery } from '@warp-drive/utilities/json-api';

const options = postQuery('person', { include: ['pets', 'friends'] }, { reload: true });
const data = await store.request(options);
```

### Type Parameters

#### T

`T`

#### M

`M` *extends*
| [`ObjectValue`](../../../core/types/json/raw/types/ObjectValue.md)
| `undefined` =
| [`ObjectValue`](../../../core/types/json/raw/types/ObjectValue.md)
| `undefined`

#### E

`E` *extends* `object` = [`ApiError`](../../../core/types/spec/error/types/ApiError.md)

### Parameters

#### type

[`TypeFromInstance`](../../../core/types/record/types/TypeFromInstance.md)<`T`>

the name of the resource type to query

#### query?

[`QueryParamsSource`](../../../core/types/params/types/QueryParamsSource.md)

the query params to send with the request

#### options?

`ConstrainedRequestOptions`

options to modify the request behavior

### Returns

`PostQueryRequestOptions`<`ReactiveDataDocument`<`T`\[], `M`, `E`>>

## Call Signature

```ts
function postQuery(
   type: string, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): PostQueryRequestOptions;
```

Defined in: [-private/json-api/query.ts:167](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/utilities/src/-private/json-api/query.ts#L167)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most JSON:API APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

The key difference between this and `query` is that this method will send the query
as the JSON body of a "POST" request instead of as query params in the url of a "GET"
request.

A CacheKey is generated from the url and query params, and used to cache the response
in the store.

```ts
import { postQuery } from '@warp-drive/utilities/json-api';

const options = postQuery('person', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**Supplying Options to Modify the Request Behavior**

The following options are supported:

* `host` - The host to use for the request, defaults to the `host` configured with `setBuildURLConfig`.
* `namespace` - The namespace to use for the request, defaults to the `namespace` configured with `setBuildURLConfig`.
* `resourcePath` - The resource path to use for the request, defaults to pluralizing the supplied type
* `reload` - Whether to forcibly reload the request if it is already in the store, not supplying this
  option will delegate to the store's CachePolicy, defaulting to `false` if none is configured.
* `backgroundReload` - Whether to reload the request if it is already in the store, but to also resolve the
  promise with the cached value, not supplying this option will delegate to the store's CachePolicy,
  defaulting to `false` if none is configured.
* `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { postQuery } from '@warp-drive/utilities/json-api';

const options = postQuery('person', { include: ['pets', 'friends'] }, { reload: true });
const data = await store.request(options);
```

### Parameters

#### type

`string`

the name of the resource type to query

#### query?

[`QueryParamsSource`](../../../core/types/params/types/QueryParamsSource.md)

the query params to send with the request

#### options?

`ConstrainedRequestOptions`

options to modify the request behavior

### Returns

`PostQueryRequestOptions`
