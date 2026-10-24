---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/utilities/active-record/functions/deleteRecord.md
description: >-
  Builds a `DELETE` request that persists deletion of an existing record, using
  ActiveRecord-style URLs.
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

Defined in: [-private/active-record/save-record.ts:80](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/-private/active-record/save-record.ts#L80)

Builds request options to delete record for resources,
configured for the url, method and header expectations of ActiveRecord APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

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

Defined in: [-private/active-record/save-record.ts:81](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/-private/active-record/save-record.ts#L81)

Builds request options to delete record for resources,
configured for the url, method and header expectations of ActiveRecord APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

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
