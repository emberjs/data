---
url: /pr-preview/pr-11087/api/@warp-drive/legacy/adapter/classes/Adapter.md
---

&#x20;

# &#x20;Adapter

Defined in: [warp-drive-packages/legacy/src/adapter.ts:257](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L257)

An adapter is an object that receives requests from a store and
translates them into the appropriate action to take against your
persistence layer. The persistence layer is usually an HTTP API but
may be anything, such as the browser's local storage. Typically the
adapter is not invoked directly instead its functionality is accessed
through the `store`.

> ⚠️ CAUTION you likely want the docs for [MinimumAdapterInterface](../../compat/types/MinimumAdapterInterface.md)
> as extending this abstract class is unnecessary.

### Creating an Adapter

Create a new subclass of `Adapter` in the `app/adapters` folder:

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';

export default class extends Adapter {
  // ...your code here
}
```

Model-specific adapters can be created by putting your adapter
class in an `app/adapters/` + `model-name` + `.js` file of the application.

```js [app/adapters/post.js]
import { Adapter } from '@warp-drive/legacy/adapter';

export default class extends Adapter {
  // ...Post-specific adapter code goes here
}
```

`Adapter` is an abstract base class that you should override in your
application to customize it for your backend. The minimum set of methods
that you should implement is:

* `findRecord()`
* `createRecord()`
* `updateRecord()`
* `deleteRecord()`
* `findAll()`
* `query()`

To improve the network performance of your application, you can optimize
your adapter by overriding these lower-level methods:

* `findMany()`

For an example of the implementation, see `RESTAdapter`, the
included REST adapter.

## Extends

* `EmberObject`

## Implements

* [`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md)

## Constructors

### Constructor

```ts
new Adapter(owner?: Owner): Adapter;
```

Defined in: [node\_modules/.pnpm/ember-source@7.3.0/node\_modules/ember-source/types/stable/@ember/object/index.d.ts:28](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/node_modules/.pnpm/ember-source@7.3.0/node_modules/ember-source/types/stable/@ember/object/index.d.ts#L28)

#### Parameters

##### owner?

`Owner`

#### Returns

`Adapter`

#### Inherited from

```ts
EmberObject.constructor
```

## Methods

### createRecord()

```ts
createRecord(
   store: Store$1, 
   type: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:510](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L510)

Implement this method in a subclass to handle the creation of
new records.

Serializes the record and sends it to the server.

Example

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';
import RSVP from 'RSVP';
import $ from 'jquery';

export default class ApplicationAdapter extends Adapter {
  createRecord(store, type, snapshot) {
    let data = this.serialize(snapshot, { includeId: true });

    return new RSVP.Promise(function (resolve, reject) {
      $.ajax({
        type: 'POST',
        url: `/${type.modelName}`,
        dataType: 'json',
        data: data
      }).then(function (data) {
        resolve(data);
      }, function (jqXHR) {
        jqXHR.then = null; // tame jQuery's ill mannered promises
        reject(jqXHR);
      });
    });
  }
}
```

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../compat/types/AdapterPayload.md)>

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`createRecord`](../../compat/types/MinimumAdapterInterface.md#createrecord)

***

### deleteRecord()

```ts
deleteRecord(
   store: Store$1, 
   type: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:614](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L614)

Implement this method in a subclass to handle the deletion of
a record.

Sends a delete request for the record to the server.

Example

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';
import RSVP from 'RSVP';
import $ from 'jquery';

export default class ApplicationAdapter extends Adapter {
  deleteRecord(store, type, snapshot) {
    let data = this.serialize(snapshot, { includeId: true });
    let id = snapshot.id;

    return new RSVP.Promise(function(resolve, reject) {
      $.ajax({
        type: 'DELETE',
        url: `/${type.modelName}/${id}`,
        dataType: 'json',
        data: data
      }).then(function(data) {
        resolve(data)
      }, function(jqXHR) {
        jqXHR.then = null; // tame jQuery's ill mannered promises
        reject(jqXHR);
      });
    });
  }
}
```

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

the Model class of the record

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../compat/types/AdapterPayload.md)>

promise

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`deleteRecord`](../../compat/types/MinimumAdapterInterface.md#deleterecord)

***

### findAll()

```ts
findAll(
   store: Store$1, 
   type: ModelSchema, 
   neverSet: null, 
   snapshotRecordArray: SnapshotRecordArray
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:330](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L330)

The `findAll()` method is used to retrieve all records for a given type.

Example

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';
import RSVP from 'RSVP';
import $ from 'jquery';

export default class ApplicationAdapter extends Adapter {
  findAll(store, type) {
    return new RSVP.Promise(function(resolve, reject) {
      $.getJSON(`/${type.modelName}`).then(function(data) {
        resolve(data);
      }, function(jqXHR) {
        reject(jqXHR);
      });
    });
  }
}
```

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### neverSet

`null`

a value is never provided to this argument

##### snapshotRecordArray

`SnapshotRecordArray`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../compat/types/AdapterPayload.md)>

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`findAll`](../../compat/types/MinimumAdapterInterface.md#findall)

***

### findRecord()

```ts
findRecord(
   store: Store$1, 
   type: ModelSchema, 
   id: string, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:298](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L298)

The `findRecord()` method is invoked when the store is asked for a record that
has not previously been loaded. In response to `findRecord()` being called, you
should query your persistence layer for a record with the given ID. The `findRecord`
method should return a promise that will resolve to a JavaScript object that will be
normalized by the serializer.

Here is an example of the `findRecord` implementation:

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';
import RSVP from 'RSVP';
import $ from 'jquery';

export default class ApplicationAdapter extends Adapter {
  findRecord(store, type, id, snapshot) {
    return new RSVP.Promise(function(resolve, reject) {
      $.getJSON(`/${type.modelName}/${id}`).then(function(data) {
        resolve(data);
      }, function(jqXHR) {
        reject(jqXHR);
      });
    });
  }
}
```

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### id

`string`

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../compat/types/AdapterPayload.md)>

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`findRecord`](../../compat/types/MinimumAdapterInterface.md#findrecord)

***

### groupRecordsForFindMany()

```ts
groupRecordsForFindMany(store: Store$1, snapshots: Snapshot<unknown>[]): Snapshot<unknown>[][];
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:694](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L694)

Organize records into groups, each of which is to be passed to separate
calls to `findMany`.

For example, if your API has nested URLs that depend on the parent, you will
want to group records by their parent.

The default implementation returns the records as a single group.

#### Parameters

##### store

`Store$1`

##### snapshots

`Snapshot`<`unknown`>\[]

#### Returns

`Snapshot`<`unknown`>\[]\[]

an array of arrays of records, each of which is to be
loaded separately by `findMany`.

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`groupRecordsForFindMany`](../../compat/types/MinimumAdapterInterface.md#grouprecordsforfindmany)

***

### query()

```ts
query(
   store: Store$1, 
   type: ModelSchema, 
   query: Record<string, unknown>
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:368](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L368)

This method is called when you call `query` on the store.

Example

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';
import RSVP from 'RSVP';
import $ from 'jquery';

export default class ApplicationAdapter extends Adapter {
  query(store, type, query) {
    return new RSVP.Promise(function(resolve, reject) {
      $.getJSON(`/${type.modelName}`, query).then(function(data) {
        resolve(data);
      }, function(jqXHR) {
        reject(jqXHR);
      });
    });
  }
}
```

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../compat/types/AdapterPayload.md)>

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`query`](../../compat/types/MinimumAdapterInterface.md#query)

***

### queryRecord()

```ts
queryRecord(
   store: Store$1, 
   type: ModelSchema, 
   query: Record<string, unknown>, 
   adapterOptions: object
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:399](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L399)

The `queryRecord()` method is invoked when the store is asked for a single
record through a query object.

In response to `queryRecord()` being called, you should always fetch fresh
data. Once found, you can asynchronously call the store's `push()` method
to push the record into the store.

Here is an example `queryRecord` implementation:

Example

```js [app/adapters/application.js]
import  { Adapter, BuildURLMixin } from '@warp-drive/legacy/adapter';

export default class ApplicationAdapter extends Adapter.extend(BuildURLMixin) {
  queryRecord(store, type, query) {
    return fetch(`/${type.modelName}`, { body: JSON.stringify(query) })
      .then((response) => response.json());
  }
}
```

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### adapterOptions

`object`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../compat/types/AdapterPayload.md)>

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`queryRecord`](../../compat/types/MinimumAdapterInterface.md#queryrecord)

***

### serialize()

```ts
serialize(snapshot: Snapshot, options: SerializerOptions): Record<string, unknown>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:464](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L464)

Proxies to the serializer's `serialize` method.

Example

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';

export default class ApplicationAdapter extends Adapter {
  createRecord(store, type, snapshot) {
    let data = this.serialize(snapshot, { includeId: true });
    let url = `/${type.modelName}`;

    // ...
  }
}
```

#### Parameters

##### snapshot

`Snapshot`

##### options

[`SerializerOptions`](../../compat/types/SerializerOptions.md)

#### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

***

### shouldBackgroundReloadAll()

```ts
shouldBackgroundReloadAll(store: Store$1, snapshotRecordArray: SnapshotRecordArray): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:871](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L871)

This method is used by the store to determine if the store should
reload a record array after the `store.findAll` method resolves
with a cached record array.

This method is *only* checked by the store when the store is
returning a cached record array.

If this method returns `true` the store will re-fetch all records
from the adapter.

For example, if you do not want to fetch complex data over a mobile
connection, or if the network is down, you can implement
`shouldBackgroundReloadAll` as follows:

```javascript
shouldBackgroundReloadAll(store, snapshotArray) {
  let { downlink, effectiveType } = navigator.connection;

  return downlink > 0 && effectiveType === '4g';
}
```

By default this method returns `true`, indicating that a background reload
should always be triggered.

#### Parameters

##### store

`Store$1`

##### snapshotRecordArray

`SnapshotRecordArray`

#### Returns

`boolean`

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`shouldBackgroundReloadAll`](../../compat/types/MinimumAdapterInterface.md#shouldbackgroundreloadall)

***

### shouldBackgroundReloadRecord()

```ts
shouldBackgroundReloadRecord(store: Store$1, snapshot: Snapshot): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:835](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L835)

This method is used by the store to determine if the store should
reload a record after the `store.findRecord` method resolves a
cached record.

This method is *only* checked by the store when the store is
returning a cached record.

If this method returns `true` the store will re-fetch a record from
the adapter.

For example, if you do not want to fetch complex data over a mobile
connection, or if the network is down, you can implement
`shouldBackgroundReloadRecord` as follows:

```javascript
shouldBackgroundReloadRecord(store, snapshot) {
  let { downlink, effectiveType } = navigator.connection;

  return downlink > 0 && effectiveType === '4g';
}
```

By default, this hook returns `true` so the data for the record is updated
in the background.

#### Parameters

##### store

`Store$1`

##### snapshot

`Snapshot`

#### Returns

`boolean`

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`shouldBackgroundReloadRecord`](../../compat/types/MinimumAdapterInterface.md#shouldbackgroundreloadrecord)

***

### shouldReloadAll()

```ts
shouldReloadAll(store: Store$1, snapshotRecordArray: SnapshotRecordArray): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:799](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L799)

This method is used by the store to determine if the store should
reload all records from the adapter when records are requested by
`store.findAll`.

If this method returns `true`, the store will re-fetch all records from
the adapter. If this method returns `false`, the store will resolve
immediately using the cached records.

For example, if you are building an events ticketing system, in which users
can only reserve tickets for 20 minutes at a time, and want to ensure that
in each route you have data that is no more than 20 minutes old you could
write:

```javascript
shouldReloadAll(store, snapshotArray) {
  let snapshots = snapshotArray.snapshots();

  return snapshots.any((ticketSnapshot) => {
    let lastAccessedAt = ticketSnapshot.attr('lastAccessedAt');
    let timeDiff = moment().diff(lastAccessedAt, 'minutes');

    if (timeDiff > 20) {
      return true;
    } else {
      return false;
    }
  });
}
```

This method would ensure that whenever you do `store.findAll('ticket')` you
will always get a list of tickets that are no more than 20 minutes old. In
case a cached version is more than 20 minutes old, `findAll` will not
resolve until you fetched the latest versions.

By default, this method returns `true` if the passed `snapshotRecordArray`
is empty (meaning that there are no records locally available yet),
otherwise, it returns `false`.

Note that, with default settings, `shouldBackgroundReloadAll` will always
re-fetch all the records in the background even if `shouldReloadAll` returns
`false`. You can override `shouldBackgroundReloadAll` if this does not suit
your use case.

#### Parameters

##### store

`Store$1`

##### snapshotRecordArray

`SnapshotRecordArray`

#### Returns

`boolean`

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`shouldReloadAll`](../../compat/types/MinimumAdapterInterface.md#shouldreloadall)

***

### shouldReloadRecord()

```ts
shouldReloadRecord(store: Store$1, snapshot: Snapshot): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:744](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L744)

This method is used by the store to determine if the store should
reload a record from the adapter when a record is requested by
`store.findRecord`.

If this method returns `true`, the store will re-fetch a record from
the adapter. If this method returns `false`, the store will resolve
immediately using the cached record.

For example, if you are building an events ticketing system, in which users
can only reserve tickets for 20 minutes at a time, and want to ensure that
in each route you have data that is no more than 20 minutes old you could
write:

```javascript
shouldReloadRecord(store, ticketSnapshot) {
  let lastAccessedAt = ticketSnapshot.attr('lastAccessedAt');
  let timeDiff = moment().diff(lastAccessedAt, 'minutes');

  if (timeDiff > 20) {
    return true;
  } else {
    return false;
  }
}
```

This method would ensure that whenever you do `store.findRecord('ticket',
id)` you will always get a ticket that is no more than 20 minutes old. In
case the cached version is more than 20 minutes old, `findRecord` will not
resolve until you fetched the latest version.

By default this hook returns `false`, as most UIs should not block user
interactions while waiting on data update.

Note that, with default settings, `shouldBackgroundReloadRecord` will always
re-fetch the records in the background even if `shouldReloadRecord` returns
`false`. You can override `shouldBackgroundReloadRecord` if this does not
suit your use case.

#### Parameters

##### store

`Store$1`

##### snapshot

`Snapshot`

#### Returns

`boolean`

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`shouldReloadRecord`](../../compat/types/MinimumAdapterInterface.md#shouldreloadrecord)

***

### updateRecord()

```ts
updateRecord(
   store: Store$1, 
   type: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:566](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L566)

Implement this method in a subclass to handle the updating of
a record.

Serializes the record update and sends it to the server.

The updateRecord method is expected to return a promise that will
resolve with the serialized record. This allows the backend to
inform the WarpDrive store the current state of this record after
the update. If it is not possible to return a serialized record
the updateRecord promise can also resolve with `undefined` and the
WarpDrive store will assume all of the updates were successfully
applied on the backend.

Example

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';
import RSVP from 'RSVP';
import $ from 'jquery';

export default class ApplicationAdapter extends Adapter {
  updateRecord(store, type, snapshot) {
    let data = this.serialize(snapshot, { includeId: true });
    let id = snapshot.id;

    return new RSVP.Promise(function(resolve, reject) {
      $.ajax({
        type: 'PUT',
        url: `/${type.modelName}/${id}`,
        dataType: 'json',
        data: data
      }).then(function(data) {
        resolve(data);
      }, function(jqXHR) {
        jqXHR.then = null; // tame jQuery's ill mannered promises
        reject(jqXHR);
      });
    });
  }
}
```

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

the Model class of the record

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../compat/types/AdapterPayload.md)>

promise

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`updateRecord`](../../compat/types/MinimumAdapterInterface.md#updaterecord)

## Properties

### store

```ts
store: Store$1;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:261](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L261)

The Store service instance that owns this Adapter.

### coalesceFindRequests

#### Get Signature

```ts
get coalesceFindRequests(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:630](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L630)

By default the store will try to coalesce all `findRecord` calls within the same runloop
into as few requests as possible by calling groupRecordsForFindMany and passing it into a findMany call.
You can opt out of this behaviour by either not implementing the findMany hook or by setting
coalesceFindRequests to false.

##### Returns

`boolean`

#### Set Signature

```ts
set coalesceFindRequests(value: boolean): void;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:638](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter.ts#L638)

**`Optional`**

If your adapter implements `findMany`, setting this to `true` will cause `findRecord`
requests triggered within the same `runloop` to be coalesced into one or more calls
to `adapter.findMany`. The number of calls made and the records contained in each call
can be tuned by your adapter's `groupRecordsForHasMany` method.

Implementing coalescing using this flag and the associated methods does not always offer
the right level of correctness, timing control or granularity. If your application would
be better suited coalescing across multiple types, coalescing for longer than a single runloop,
or with a more custom request structure, coalescing within your application adapter may prove
more effective.

##### Parameters

###### value

`boolean`

##### Returns

`void`

**`Optional`**

If your adapter implements `findMany`, setting this to `true` will cause `findRecord`
requests triggered within the same `runloop` to be coalesced into one or more calls
to `adapter.findMany`. The number of calls made and the records contained in each call
can be tuned by your adapter's `groupRecordsForHasMany` method.

Implementing coalescing using this flag and the associated methods does not always offer
the right level of correctness, timing control or granularity. If your application would
be better suited coalescing across multiple types, coalescing for longer than a single runloop,
or with a more custom request structure, coalescing within your application adapter may prove
more effective.

#### Implementation of

[`MinimumAdapterInterface`](../../compat/types/MinimumAdapterInterface.md).[`coalesceFindRequests`](../../compat/types/MinimumAdapterInterface.md#coalescefindrequests)
