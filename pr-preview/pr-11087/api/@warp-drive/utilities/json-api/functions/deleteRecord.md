---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/utilities/json-api/functions/deleteRecord.md
---

# &#x20;deleteRecord()

```ts
function deleteRecord<T>(record: T, options?: ConstrainedRequestOptions): DeleteRequestOptions<T>;
function deleteRecord(record: unknown, options?: ConstrainedRequestOptions): DeleteRequestOptions;
```

## Call Signature

```ts
function deleteRecord<T>(record: T, options?: ConstrainedRequestOptions): DeleteRequestOptions<T>;
```

Defined in: [-private/json-api/save-record.ts:83](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/utilities/src/-private/json-api/save-record.ts#L83)

:::warning ⚠️ **These Mutation Builders DO NOT Set The Request Body**
While this may come as a surprise, the app providing the body ensures that only
desired and correctly formatted data is sent with the request.
:::

Builds request options to delete record for resources,
configured for the url, method and header expectations of most JSON:API APIs.

**Basic Usage**

```ts
import { deleteRecord } from '@warp-drive/utilities/json-api';

const person = store.peekRecord('person', '1');

// mark record as deleted
store.deleteRecord(person);

// persist deletion
const data = await store.request(deleteRecord(person));
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
import { deleteRecord } from '@warp-drive/utilities/json-api';

const person = store.peekRecord('person', '1');

// mark record as deleted
store.deleteRecord(person);

// persist deletion
const options = deleteRecord(person, { namespace: 'api/v1' });
const data = await store.request(options);
```

### Type Parameters

#### T

`T`

### Parameters

#### record

`T`

#### options?

`ConstrainedRequestOptions`

### Returns

`DeleteRequestOptions`<`T`>

## Call Signature

```ts
function deleteRecord(record: unknown, options?: ConstrainedRequestOptions): DeleteRequestOptions;
```

Defined in: [-private/json-api/save-record.ts:84](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/utilities/src/-private/json-api/save-record.ts#L84)

:::warning ⚠️ **These Mutation Builders DO NOT Set The Request Body**
While this may come as a surprise, the app providing the body ensures that only
desired and correctly formatted data is sent with the request.
:::

Builds request options to delete record for resources,
configured for the url, method and header expectations of most JSON:API APIs.

**Basic Usage**

```ts
import { deleteRecord } from '@warp-drive/utilities/json-api';

const person = store.peekRecord('person', '1');

// mark record as deleted
store.deleteRecord(person);

// persist deletion
const data = await store.request(deleteRecord(person));
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
import { deleteRecord } from '@warp-drive/utilities/json-api';

const person = store.peekRecord('person', '1');

// mark record as deleted
store.deleteRecord(person);

// persist deletion
const options = deleteRecord(person, { namespace: 'api/v1' });
const data = await store.request(options);
```

### Parameters

#### record

`unknown`

#### options?

`ConstrainedRequestOptions`

### Returns

`DeleteRequestOptions`
