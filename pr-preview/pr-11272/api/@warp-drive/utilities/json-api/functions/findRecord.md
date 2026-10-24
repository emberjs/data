---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/utilities/json-api/functions/findRecord.md
---

# &#x20;findRecord()

```ts
function findRecord<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
| undefined, E extends object = ApiError>(identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>>, options?: FindRecordOptions$2): FindRecordRequestOptions<ReactiveDataDocument<T, M, E>, T>;
function findRecord(identifier: RemotelyAccessibleIdentifier, options?: FindRecordOptions$2): FindRecordRequestOptions;
function findRecord<T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = ApiError>(
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
| undefined, E extends object = ApiError>(identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>>, options?: FindRecordOptions$2): FindRecordRequestOptions<ReactiveDataDocument<T, M, E>, T>;
```

Defined in: [-private/json-api/find-record.ts:91](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/json-api/find-record.ts#L91)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most JSON:API APIs.

:::tabs

\== Basic Usage

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const result = await store.request(
  findRecord<Person>('person', '1')
);
```

\== With Options

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    'person', '1',
    { include: ['pets', 'friends'] }
  )
);
```

\== With an Identifier

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    { type: 'person', id: '1' },
    { include: ['pets', 'friends'] }
  )
);
```

:::

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
import { findRecord } from '@warp-drive/utilities/json-api';

const data = await store.request(
  findRecord(
    'person', '1',
    { include: ['pets', 'friends'] },
    { namespace: 'api/v2' }
  )
);
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

`E` *extends* `object` = [`ApiError`](../../../core/types/spec/error/types/ApiError.md)

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

Defined in: [-private/json-api/find-record.ts:95](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/json-api/find-record.ts#L95)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most JSON:API APIs.

:::tabs

\== Basic Usage

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const result = await store.request(
  findRecord<Person>('person', '1')
);
```

\== With Options

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    'person', '1',
    { include: ['pets', 'friends'] }
  )
);
```

\== With an Identifier

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    { type: 'person', id: '1' },
    { include: ['pets', 'friends'] }
  )
);
```

:::

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
import { findRecord } from '@warp-drive/utilities/json-api';

const data = await store.request(
  findRecord(
    'person', '1',
    { include: ['pets', 'friends'] },
    { namespace: 'api/v2' }
  )
);
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
  | undefined, E extends object = ApiError>(
   type: TypeFromInstance<T>, 
   id: string, 
   options?: FindRecordOptions$2
): FindRecordRequestOptions<ReactiveDataDocument<T, M, E>, T>;
```

Defined in: [-private/json-api/find-record.ts:99](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/json-api/find-record.ts#L99)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most JSON:API APIs.

:::tabs

\== Basic Usage

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const result = await store.request(
  findRecord<Person>('person', '1')
);
```

\== With Options

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    'person', '1',
    { include: ['pets', 'friends'] }
  )
);
```

\== With an Identifier

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    { type: 'person', id: '1' },
    { include: ['pets', 'friends'] }
  )
);
```

:::

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
import { findRecord } from '@warp-drive/utilities/json-api';

const data = await store.request(
  findRecord(
    'person', '1',
    { include: ['pets', 'friends'] },
    { namespace: 'api/v2' }
  )
);
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

`E` *extends* `object` = [`ApiError`](../../../core/types/spec/error/types/ApiError.md)

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

Defined in: [-private/json-api/find-record.ts:104](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/utilities/src/-private/json-api/find-record.ts#L104)

Builds request options to fetch a single resource by a known id or identifier
configured for the url and header expectations of most JSON:API APIs.

:::tabs

\== Basic Usage

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const result = await store.request(
  findRecord<Person>('person', '1')
);
```

\== With Options

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    'person', '1',
    { include: ['pets', 'friends'] }
  )
);
```

\== With an Identifier

```ts
import { findRecord } from '@warp-drive/utilities/json-api';
import type { Person } from '#/data/types';

const data = await store.request(
  findRecord<Person>(
    { type: 'person', id: '1' },
    { include: ['pets', 'friends'] }
  )
);
```

:::

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
import { findRecord } from '@warp-drive/utilities/json-api';

const data = await store.request(
  findRecord(
    'person', '1',
    { include: ['pets', 'friends'] },
    { namespace: 'api/v2' }
  )
);
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
