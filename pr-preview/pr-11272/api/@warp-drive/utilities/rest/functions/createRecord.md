---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/utilities/rest/functions/createRecord.md
---

# &#x20;createRecord()

```ts
function createRecord<T>(record: T, options?: ConstrainedRequestOptions): CreateRequestOptions<T>;
function createRecord(record: unknown, options?: ConstrainedRequestOptions): CreateRequestOptions;
```

## Call Signature

```ts
function createRecord<T>(record: T, options?: ConstrainedRequestOptions): CreateRequestOptions<T>;
```

Defined in: [-private/rest/save-record.ts:146](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/rest/save-record.ts#L146)

Builds request options to create new record for resources,
configured for the url, method and header expectations of most REST APIs.

**Basic Usage**

```ts
import { createRecord } from '@warp-drive/utilities/rest';

const person = store.createRecord('person', { name: 'Ted' });
const data = await store.request(createRecord(person));
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
import { createRecord } from '@warp-drive/utilities/rest';

const person = store.createRecord('person', { name: 'Ted' });
const options = createRecord(person, { namespace: 'api/v1' });
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

`CreateRequestOptions`<`T`>

## Call Signature

```ts
function createRecord(record: unknown, options?: ConstrainedRequestOptions): CreateRequestOptions;
```

Defined in: [-private/rest/save-record.ts:147](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/rest/save-record.ts#L147)

Builds request options to create new record for resources,
configured for the url, method and header expectations of most REST APIs.

**Basic Usage**

```ts
import { createRecord } from '@warp-drive/utilities/rest';

const person = store.createRecord('person', { name: 'Ted' });
const data = await store.request(createRecord(person));
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
import { createRecord } from '@warp-drive/utilities/rest';

const person = store.createRecord('person', { name: 'Ted' });
const options = createRecord(person, { namespace: 'api/v1' });
const data = await store.request(options);
```

### Parameters

#### record

`unknown`

#### options?

`ConstrainedRequestOptions`

### Returns

`CreateRequestOptions`
