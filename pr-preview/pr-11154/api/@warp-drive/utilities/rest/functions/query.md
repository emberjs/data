---
url: /pr-preview/pr-11154/api/@warp-drive/utilities/rest/functions/query.md
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

Defined in: [-private/rest/query.ts:58](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/-private/rest/query.ts#L58)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most REST APIs.

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

Defined in: [-private/rest/query.ts:63](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/-private/rest/query.ts#L63)

Builds request options to query for resources, usually by a primary
type, configured for the url and header expectations of most REST APIs.

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
