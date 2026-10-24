---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/utilities/json-api/functions/query.md
description: >-
  Builds a JSON:API `GET` request that queries a resource type, sending the
  query as URL query params.
---

# &#x20;query()

```ts
function query<T extends TypedRecordInstance, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = ApiError>(
   type: TypeFromInstance<T>, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): QueryRequestOptions<ReactiveDataDocument<T[], M, E>>;
function query(
   type: string, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): QueryRequestOptions;
```

## Call Signature

```ts
function query<T extends TypedRecordInstance, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = ApiError>(
   type: TypeFromInstance<T>, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): QueryRequestOptions<ReactiveDataDocument<T[], M, E>>;
```

Defined in: [-private/json-api/query.ts:70](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/utilities/src/-private/json-api/query.ts#L70)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most JSON:API APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

The key difference between this and `postQuery` is that this method will send the query
as query params in the url of a "GET" request instead of as the JSON body of a "POST"
request.

**Basic Usage**

```ts
import { query } from '@warp-drive/utilities/json-api';

const data = await store.request(query('person'));
```

**With Query Params**

```ts
import { query } from '@warp-drive/utilities/json-api';

const options = query('person', { include: ['pets', 'friends'] });
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
import { query } from '@warp-drive/utilities/json-api';

const options = query('person', { include: ['pets', 'friends'] }, { reload: true });
const data = await store.request(options);
```

### Type Parameters

#### T

`T` *extends* [`TypedRecordInstance`](../../../core/types/record/types/TypedRecordInstance.md)

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

#### query?

[`QueryParamsSource`](../../../core/types/params/types/QueryParamsSource.md)

#### options?

`ConstrainedRequestOptions`

### Returns

`QueryRequestOptions`<`ReactiveDataDocument`<`T`\[], `M`, `E`>>

## Call Signature

```ts
function query(
   type: string, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): QueryRequestOptions;
```

Defined in: [-private/json-api/query.ts:79](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/utilities/src/-private/json-api/query.ts#L79)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most JSON:API APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

The key difference between this and `postQuery` is that this method will send the query
as query params in the url of a "GET" request instead of as the JSON body of a "POST"
request.

**Basic Usage**

```ts
import { query } from '@warp-drive/utilities/json-api';

const data = await store.request(query('person'));
```

**With Query Params**

```ts
import { query } from '@warp-drive/utilities/json-api';

const options = query('person', { include: ['pets', 'friends'] });
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
import { query } from '@warp-drive/utilities/json-api';

const options = query('person', { include: ['pets', 'friends'] }, { reload: true });
const data = await store.request(options);
```

### Parameters

#### type

`string`

#### query?

[`QueryParamsSource`](../../../core/types/params/types/QueryParamsSource.md)

#### options?

`ConstrainedRequestOptions`

### Returns

`QueryRequestOptions`
