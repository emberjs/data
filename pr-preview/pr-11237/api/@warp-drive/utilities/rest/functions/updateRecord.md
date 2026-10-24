---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/utilities/rest/functions/updateRecord.md
description: >-
  Builds a `PUT` (or `PATCH`) request that saves changes to an existing record,
  using REST-style URLs.
---

# &#x20;updateRecord()

```ts
function updateRecord<T extends TypedRecordInstance, RT extends TypedRecordInstance = T, M extends 
  | ObjectValue
  | undefined = 
  | ObjectValue
  | undefined, E extends object = object>(record: T, options?: ConstrainedRequestOptions & {
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
  | undefined, E extends object = object>(record: T, options?: ConstrainedRequestOptions & {
  patch?: boolean;
}): UpdateRequestOptions<ReactiveDataDocument<RT, M, E>, T>;
```

Defined in: [-private/rest/save-record.ts:230](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/-private/rest/save-record.ts#L230)

Builds request options to update existing record for resources,
configured for the url, method and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { updateRecord } from '@warp-drive/utilities/rest';

const person = store.peekRecord('person', '1');
person.name = 'Chris';
const data = await store.request(updateRecord(person));
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
import { updateRecord } from '@warp-drive/utilities/rest';

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

`E` *extends* `object` = `object`

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

Defined in: [-private/rest/save-record.ts:239](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/-private/rest/save-record.ts#L239)

Builds request options to update existing record for resources,
configured for the url, method and header expectations of most REST APIs.

See the [Builders](/guides/the-manual/requests/builders) guide for what request builders do and
when to use one.

**Basic Usage**

```ts
import { updateRecord } from '@warp-drive/utilities/rest';

const person = store.peekRecord('person', '1');
person.name = 'Chris';
const data = await store.request(updateRecord(person));
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
import { updateRecord } from '@warp-drive/utilities/rest';

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
