---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/utilities/rest/functions/query.md
description: >-
  Builds a `GET` request that queries a resource type with query params, using
  REST-style URLs.
---

# &#x20;query()

```ts
function query<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = object>(
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
function query<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = object>(
   type: TypeFromInstance<T>, 
   query?: QueryParamsSource, 
   options?: ConstrainedRequestOptions
): QueryRequestOptions<ReactiveDataDocument<T[], M, E>>;
```

Defined in: [-private/rest/query.ts:62](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/utilities/src/-private/rest/query.ts#L62)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { query } from '@warp-drive/utilities/rest';

const data = await store.request(query('person'));
```

**With Query Params**

```ts
import { query } from '@warp-drive/utilities/rest';

const options = query('person', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**Supplying Options to Modify the Request Behavior**

The following options are supported:

* `host` - The host to use for the request, defaults to the `host` configured with `setBuildURLConfig`.
* `namespace` - The namespace to use for the request, defaults to the `namespace` configured with `setBuildURLConfig`.
* `resourcePath` - The resource path to use for the request, defaults to pluralizing and camelCasing the supplied type
* `reload` - Whether to forcibly reload the request if it is already in the store, not supplying this
  option will delegate to the store's CachePolicy, defaulting to `false` if none is configured.
* `backgroundReload` - Whether to reload the request if it is already in the store, but to also resolve the
  promise with the cached value, not supplying this option will delegate to the store's CachePolicy,
  defaulting to `false` if none is configured.
* `urlParamsSettings` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { query } from '@warp-drive/utilities/rest';

const options = query('person', { include: ['pets', 'friends'] }, { reload: true });
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

`E` *extends* `object` = `object`

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

Defined in: [-private/rest/query.ts:67](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/utilities/src/-private/rest/query.ts#L67)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { query } from '@warp-drive/utilities/rest';

const data = await store.request(query('person'));
```

**With Query Params**

```ts
import { query } from '@warp-drive/utilities/rest';

const options = query('person', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**Supplying Options to Modify the Request Behavior**

The following options are supported:

* `host` - The host to use for the request, defaults to the `host` configured with `setBuildURLConfig`.
* `namespace` - The namespace to use for the request, defaults to the `namespace` configured with `setBuildURLConfig`.
* `resourcePath` - The resource path to use for the request, defaults to pluralizing and camelCasing the supplied type
* `reload` - Whether to forcibly reload the request if it is already in the store, not supplying this
  option will delegate to the store's CachePolicy, defaulting to `false` if none is configured.
* `backgroundReload` - Whether to reload the request if it is already in the store, but to also resolve the
  promise with the cached value, not supplying this option will delegate to the store's CachePolicy,
  defaulting to `false` if none is configured.
* `urlParamsSettings` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { query } from '@warp-drive/utilities/rest';

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
