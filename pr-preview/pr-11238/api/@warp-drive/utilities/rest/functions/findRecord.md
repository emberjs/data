---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/utilities/rest/functions/findRecord.md
description: >-
  Builds a `GET` request for one resource by type and id, using REST-style
  pluralized, camelCased URLs.
---

# &#x20;findRecord()

```ts
function findRecord<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
| undefined, E extends object = object>(identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>>, options?: FindRecordOptions$2): FindRecordRequestOptions<ReactiveDataDocument<T, M, E>, T>;
function findRecord(identifier: RemotelyAccessibleIdentifier, options?: FindRecordOptions$2): FindRecordRequestOptions;
function findRecord<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = object>(
   type: TypeFromInstance<T>, 
   id: string, 
   options?: FindRecordOptions$2
): FindRecordRequestOptions<ReactiveDataDocument<T, M, E>, T>;
function findRecord(
   type: string, 
   id: string, 
   options?: FindRecordOptions$2
): FindRecordRequestOptions;
```

## Call Signature

```ts
function findRecord<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
| undefined, E extends object = object>(identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>>, options?: FindRecordOptions$2): FindRecordRequestOptions<ReactiveDataDocument<T, M, E>, T>;
```

Defined in: [-private/rest/find-record.ts:71](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/-private/rest/find-record.ts#L71)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const data = await store.request(findRecord('person', '1'));
```

**With Options**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**With an Identifier**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord({ type: 'person', id: '1' }, { include: ['pets', 'friends'] });
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
* `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] }, { namespace: 'api/v2' });
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

#### identifier

`RemotelyAccessibleIdentifier`<[`TypeFromInstance`](../../../core/types/record/types/TypeFromInstance.md)<`T`>>

#### options?

`FindRecordOptions$2`

### Returns

`FindRecordRequestOptions`<`ReactiveDataDocument`<`T`, `M`, `E`>, `T`>

## Call Signature

```ts
function findRecord(identifier: RemotelyAccessibleIdentifier, options?: FindRecordOptions$2): FindRecordRequestOptions;
```

Defined in: [-private/rest/find-record.ts:75](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/-private/rest/find-record.ts#L75)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const data = await store.request(findRecord('person', '1'));
```

**With Options**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**With an Identifier**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord({ type: 'person', id: '1' }, { include: ['pets', 'friends'] });
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
* `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] }, { namespace: 'api/v2' });
const data = await store.request(options);
```

### Parameters

#### identifier

`RemotelyAccessibleIdentifier`

#### options?

`FindRecordOptions$2`

### Returns

`FindRecordRequestOptions`

## Call Signature

```ts
function findRecord<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = object>(
   type: TypeFromInstance<T>, 
   id: string, 
   options?: FindRecordOptions$2
): FindRecordRequestOptions<ReactiveDataDocument<T, M, E>, T>;
```

Defined in: [-private/rest/find-record.ts:79](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/-private/rest/find-record.ts#L79)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const data = await store.request(findRecord('person', '1'));
```

**With Options**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**With an Identifier**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord({ type: 'person', id: '1' }, { include: ['pets', 'friends'] });
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
* `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] }, { namespace: 'api/v2' });
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

#### id

`string`

#### options?

`FindRecordOptions$2`

### Returns

`FindRecordRequestOptions`<`ReactiveDataDocument`<`T`, `M`, `E`>, `T`>

## Call Signature

```ts
function findRecord(
   type: string, 
   id: string, 
   options?: FindRecordOptions$2
): FindRecordRequestOptions;
```

Defined in: [-private/rest/find-record.ts:84](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/-private/rest/find-record.ts#L84)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const data = await store.request(findRecord('person', '1'));
```

**With Options**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] });
const data = await store.request(options);
```

**With an Identifier**

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord({ type: 'person', id: '1' }, { include: ['pets', 'friends'] });
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
* `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('person', '1', { include: ['pets', 'friends'] }, { namespace: 'api/v2' });
const data = await store.request(options);
```

### Parameters

#### type

`string`

#### id

`string`

#### options?

`FindRecordOptions$2`

### Returns

`FindRecordRequestOptions`
