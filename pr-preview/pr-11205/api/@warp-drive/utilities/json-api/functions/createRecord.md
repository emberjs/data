---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/json-api/functions/createRecord.md
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

Defined in: [-private/json-api/save-record.ts:168](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/-private/json-api/save-record.ts#L168)

:::warning ⚠️ **These Mutation Builders DO NOT Set The Necessary Request Body**
While this may come as a surprise, the app providing the body ensures that only
desired and correctly formatted data is sent with the request.
:::

Builds request options to create new record for resources,
configured for the url, method and header expectations of most JSON:API APIs.

**Basic Usage**

```ts
import { cacheKeyFor } from '@warp-drive/core';
import { createRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const person = store.createRecord<Person>('person', { name: 'Ted' });
const init = createRecord(person);
init.body = JSON.stringify(
 {
   // it's likely you will want to transform this data
   // somewhat
   data: store.cache.peek(cacheKeyFor(person))
 }
);
const data = await store.request(init);
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
import { createRecord } from '@warp-drive/utilities/json-api';

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

Defined in: [-private/json-api/save-record.ts:169](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/-private/json-api/save-record.ts#L169)

:::warning ⚠️ **These Mutation Builders DO NOT Set The Necessary Request Body**
While this may come as a surprise, the app providing the body ensures that only
desired and correctly formatted data is sent with the request.
:::

Builds request options to create new record for resources,
configured for the url, method and header expectations of most JSON:API APIs.

**Basic Usage**

```ts
import { cacheKeyFor } from '@warp-drive/core';
import { createRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const person = store.createRecord<Person>('person', { name: 'Ted' });
const init = createRecord(person);
init.body = JSON.stringify(
 {
   // it's likely you will want to transform this data
   // somewhat
   data: store.cache.peek(cacheKeyFor(person))
 }
);
const data = await store.request(init);
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
import { createRecord } from '@warp-drive/utilities/json-api';

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
