---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/utilities/json-api/functions/updateRecord.md
---

# &#x20;updateRecord()

```ts
function updateRecord<T extends TypedRecordInstance, RT extends TypedRecordInstance = T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = ApiError>(record: T, options?: ConstrainedRequestOptions & {
  patch?: boolean;
}): UpdateRequestOptions<ReactiveDataDocument<RT, M, E>, T>;
function updateRecord(record: unknown, options?: ConstrainedRequestOptions & {
  patch?: boolean;
}): UpdateRequestOptions;
```

## Call Signature

```ts
function updateRecord<T extends TypedRecordInstance, RT extends TypedRecordInstance = T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = ApiError>(record: T, options?: ConstrainedRequestOptions & {
  patch?: boolean;
}): UpdateRequestOptions<ReactiveDataDocument<RT, M, E>, T>;
```

Defined in: [-private/json-api/save-record.ts:255](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/-private/json-api/save-record.ts#L255)

:::warning ⚠️ **These Mutation Builders DO NOT Set The Necessary Request Body**
While this may come as a surprise, the app providing the body ensures that only
desired and correctly formatted data is sent with the request.
:::

Builds request options to update existing record for resources,
configured for the url, method and header expectations of most JSON:API APIs.

**Example Usage**

```ts
import { cacheKeyFor } from '@warp-drive/core';
import { updateRecord } from '@warp-drive/utilities/json-api';
import type { EditablePerson } from '#/data/types';

const mutable = await checkout<EditablePerson>(person);
mutable.name = 'Chris';
const init = updateRecord(mutable);

init.body = JSON.stringify(
 // it's likely you will want to transform this data
 // somewhat, or serialize only specific properties instead
 serializePatch(store.cache, cacheKeyFor(mutable))
);
const data = await store.request(init);
```

**Supplying Options to Modify the Request Behavior**

The following options are supported:

* `patch` - Allows caller to specify whether to use a PATCH request instead of a PUT request, defaults to `false`.
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
import { updateRecord } from '@warp-drive/utilities/json-api';

const person = store.peekRecord('person', '1');
person.name = 'Chris';
const options = updateRecord(person, { patch: true });
const data = await store.request(options);
```

### Type Parameters

#### T

`T` *extends* [`TypedRecordInstance`](../../../core/types/record/types/TypedRecordInstance.md)

#### RT

`RT` *extends* [`TypedRecordInstance`](../../../core/types/record/types/TypedRecordInstance.md) = `T`

#### M

`M` *extends*
| [`ObjectValue`](../../../core/types/json/raw/types/ObjectValue.md)
| `undefined` =
| [`ObjectValue`](../../../core/types/json/raw/types/ObjectValue.md)
| `undefined`

#### E

`E` *extends* `object` = [`ApiError`](../../../core/types/spec/error/types/ApiError.md)

### Parameters

#### record

`T`

#### options?

`ConstrainedRequestOptions` & {
`patch?`: `boolean`;
}

### Returns

`UpdateRequestOptions`<`ReactiveDataDocument`<`RT`, `M`, `E`>, `T`>

## Call Signature

```ts
function updateRecord(record: unknown, options?: ConstrainedRequestOptions & {
  patch?: boolean;
}): UpdateRequestOptions;
```

Defined in: [-private/json-api/save-record.ts:264](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/-private/json-api/save-record.ts#L264)

:::warning ⚠️ **These Mutation Builders DO NOT Set The Necessary Request Body**
While this may come as a surprise, the app providing the body ensures that only
desired and correctly formatted data is sent with the request.
:::

Builds request options to update existing record for resources,
configured for the url, method and header expectations of most JSON:API APIs.

**Example Usage**

```ts
import { cacheKeyFor } from '@warp-drive/core';
import { updateRecord } from '@warp-drive/utilities/json-api';
import type { EditablePerson } from '#/data/types';

const mutable = await checkout<EditablePerson>(person);
mutable.name = 'Chris';
const init = updateRecord(mutable);

init.body = JSON.stringify(
 // it's likely you will want to transform this data
 // somewhat, or serialize only specific properties instead
 serializePatch(store.cache, cacheKeyFor(mutable))
);
const data = await store.request(init);
```

**Supplying Options to Modify the Request Behavior**

The following options are supported:

* `patch` - Allows caller to specify whether to use a PATCH request instead of a PUT request, defaults to `false`.
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
import { updateRecord } from '@warp-drive/utilities/json-api';

const person = store.peekRecord('person', '1');
person.name = 'Chris';
const options = updateRecord(person, { patch: true });
const data = await store.request(options);
```

### Parameters

#### record

`unknown`

#### options?

`ConstrainedRequestOptions` & {
`patch?`: `boolean`;
}

### Returns

`UpdateRequestOptions`
