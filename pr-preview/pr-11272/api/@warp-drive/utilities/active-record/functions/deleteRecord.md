---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/utilities/active-record/functions/deleteRecord.md
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

Defined in: [-private/active-record/save-record.ts:76](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/active-record/save-record.ts#L76)

Builds request options to delete record for resources,
configured for the url, method and header expectations of ActiveRecord APIs.

**Basic Usage**

```ts
import { deleteRecord } from '@warp-drive/utilities/active-record';

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
import { deleteRecord } from '@warp-drive/utilities/active-record';

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

Defined in: [-private/active-record/save-record.ts:77](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/active-record/save-record.ts#L77)

Builds request options to delete record for resources,
configured for the url, method and header expectations of ActiveRecord APIs.

**Basic Usage**

```ts
import { deleteRecord } from '@warp-drive/utilities/active-record';

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
import { deleteRecord } from '@warp-drive/utilities/active-record';

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
