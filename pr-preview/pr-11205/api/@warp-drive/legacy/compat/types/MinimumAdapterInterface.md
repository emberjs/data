---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/compat/types/MinimumAdapterInterface.md
---

&#x20;

# &#x20;MinimumAdapterInterface

```ts
interface MinimumAdapterInterface {
  coalesceFindRequests?: boolean;
  createRecord(store: Store$1, schema: ModelSchema, snapshot: Snapshot): Promise<AdapterPayload>;
  deleteRecord(store: Store$1, schema: ModelSchema, snapshot: Snapshot): Promise<AdapterPayload>;
  destroy?(): void;
  findAll(store: Store$1, schema: ModelSchema, sinceToken: null, snapshotRecordArray: SnapshotRecordArray): Promise<AdapterPayload>;
  findBelongsTo?(store: Store$1, snapshot: Snapshot, relatedLink: string, relationship: LegacyRelationshipField): Promise<AdapterPayload>;
  findHasMany?(store: Store$1, snapshot: Snapshot, relatedLink: string, relationship: LegacyRelationshipField): Promise<AdapterPayload>;
  findMany?(store: Store$1, schema: ModelSchema, ids: string[], snapshots: Snapshot<unknown>[]): Promise<AdapterPayload>;
  findRecord(store: Store$1, schema: ModelSchema, id: string, snapshot: Snapshot): Promise<AdapterPayload>;
  generateIdForRecord?(store: Store$1, type: string, properties: unknown): string;
  groupRecordsForFindMany?(store: Store$1, snapshots: Snapshot<unknown>[]): Group[];
  query(store: Store$1, schema: ModelSchema, query: Record<string, unknown>, recordArray: LegacyQueryArray, options: { adapterOptions?: unknown }): Promise<AdapterPayload>;
  queryRecord(store: Store$1, schema: ModelSchema, query: Record<string, unknown>, options: { adapterOptions?: unknown }): Promise<AdapterPayload>;
  shouldBackgroundReloadAll?(store: Store$1, snapshotArray: SnapshotRecordArray): boolean;
  shouldBackgroundReloadRecord?(store: Store$1, snapshot: Snapshot): boolean;
  shouldReloadAll?(store: Store$1, snapshotArray: SnapshotRecordArray): boolean;
  shouldReloadRecord?(store: Store$1, snapshot: Snapshot): boolean;
  updateRecord(store: Store$1, schema: ModelSchema, snapshot: Snapshot): Promise<AdapterPayload>;
}
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:42](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L42)

:::danger
⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new adapter, consider writing a
Handler instead to be used with the [RequestManager](../../../core/classes/RequestManager.md)
:::

The following documentation describes the methods an
adapter should implement with descriptions around when an
application might expect these methods to be called.

Methods that are not required are marked as **optional**.

(Interface) Adapter

## Methods

### createRecord()

```ts
createRecord(
   store: Store$1, 
   schema: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:224](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L224)

`adapter.createRecord` takes a request to create a resource of a given `type` and should
return a `Promise` which fulfills with data for the newly created resource.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `createRecord`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data for the record.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

If the adapter rejects or throws an error the record will enter an error state and the attributes
that had attempted to be saved will still be considered dirty.

### InvalidErrors

When rejecting a `createRecord` request due to validation issues during save (typically a 422 status code),
you may throw an `InvalidError`.

Throwing an `InvalidError` makes per-attribute errors available for records to use in the UI as needed.
Records can also use this information to mark themselves as being in an `invalid` state.
For more reading [see the RecordData Errors RFC](https://emberjs.github.io/rfcs/0465-record-data-errors.html)

```js
let error = new Error(errorMessage);

// these two properties combined
// alert WarpDrive to this error being for
// invalid properties on the record during
// the request
error.isAdapterError = true;
error.code = 'InvalidError';

// A JSON:API formatted array of errors
// See https://jsonapi.org/format/#errors
error.errors = [];

throw error;
```

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### deleteRecord()

```ts
deleteRecord(
   store: Store$1, 
   schema: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:302](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L302)

`adapter.deleteRecord` takes a request to delete a resource of a given `type` and
should return a `Promise` which resolves when that deletion is complete.

Usually the response will be empty, but you may include additional updates in the
response. The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `deleteRecord`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

If the adapter rejects or errors the record will need to be saved again once the reason
for the error is addressed in order to persist the deleted state.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### snapshot

`Snapshot`

A Snapshot containing the record's current data

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

***

### destroy()?

```ts
optional destroy(): void;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:578](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L578)

**`Optional`**

In some situations the adapter may need to perform cleanup when destroyed,
that cleanup can be done in `destroy`.

If not implemented, the store does not inform the adapter of destruction.

#### Returns

`void`

***

### findAll()

```ts
findAll(
   store: Store$1, 
   schema: ModelSchema, 
   sinceToken: null, 
   snapshotRecordArray: SnapshotRecordArray
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:100](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L100)

`adapter.findAll` takes a request for resources of a given `type` and should return
a `Promise` which fulfills with a collection of resource data matching that `type`.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `findAll`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing records for `type`. Existing records for the `type` will not be removed.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

`adapter.findAll` is called whenever `store.findAll` is asked to reload or backgroundReload.
The records in the response are merged with the contents of the store. Existing records for
the `type` will not be removed.

See also `shouldReloadAll` and `shouldBackgroundReloadAll`

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### sinceToken

`null`

This parameter is no longer used and will always be null.

##### snapshotRecordArray

`SnapshotRecordArray`

an object containing any passed in options,
adapterOptions, and the ability to access a snapshot for each existing record of the type.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### findBelongsTo()?

```ts
optional findBelongsTo(
   store: Store$1, 
   snapshot: Snapshot, 
   relatedLink: string, 
   relationship: LegacyRelationshipField
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:333](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L333)

**`Optional`**

`adapter.findBelongsTo` takes a request to fetch a related resource located at a
`relatedLink` and should return a `Promise` which fulfills with data for a single
resource.

⚠️ This method is only called if the store previously received relationship information for a resource
containing a [related link](https://jsonapi.org/format/#document-resource-object-related-resource-links).

If the cache does not have a `link` for the relationship then `findRecord` will be used if a `type` and `id`
for the related resource is known.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `findBelongsTo`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### snapshot

`Snapshot`

A Snapshot containing the parent record's current data

##### relatedLink

`string`

The link at which the associated resource might be found

##### relationship

[`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### findHasMany()?

```ts
optional findHasMany(
   store: Store$1, 
   snapshot: Snapshot, 
   relatedLink: string, 
   relationship: LegacyRelationshipField
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:370](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L370)

**`Optional`**

`adapter.findHasMany` takes a request to fetch a related resource collection located
at a `relatedLink` and should return a `Promise` which fulfills with data for that
collection.

⚠️ This method is only called if the store previously received relationship information for a resource
containing a [related link](https://jsonapi.org/format/#document-resource-object-related-resource-links).

If the cache does not have a `link` for the relationship but the `type` and `id` of
related resources are known then `findRecord` will be used for each individual related
resource.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `findHasMany`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### snapshot

`Snapshot`

A Snapshot containing the parent record's current data

##### relatedLink

`string`

The link at which the associated resource collection might be found

##### relationship

[`LegacyRelationshipField`](../../../core/types/schema/fields/types/LegacyRelationshipField.md)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### findMany()?

```ts
optional findMany(
   store: Store$1, 
   schema: ModelSchema, 
   ids: string[], 
   snapshots: Snapshot<unknown>[]
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:405](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L405)

**`Optional`**

⚠️ This Method is only called if `coalesceFindRequests` is `true`. The array passed to it is determined
by the adapter's `groupRecordsForFindMany` method, and will be called once per group returned.

`adapter.findMany` takes a request to fetch a collection of resources and should return a
`Promise` which fulfills with data for that collection.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `findMany`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

See also `groupRecordsForFindMany` and `coalesceFindRequests`

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### ids

`string`\[]

An array of the ids of the resources to fetch

##### snapshots

`Snapshot`<`unknown`>\[]

An array of snapshots of the available data for the resources to fetch

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### findRecord()

```ts
findRecord(
   store: Store$1, 
   schema: ModelSchema, 
   id: string, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:69](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L69)

`adapter.findRecord` takes a request for a resource of a given `type` and `id` combination
and should return a `Promise` which fulfills with data for a single resource matching that
`type` and `id`.

The response will be fed to the associated serializer's `normalizeResponse` method with the
`requestType` set to `findRecord`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data for the record.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

`adapter.findRecord` is called whenever the `store` needs to load, reload, or backgroundReload
the resource data for a given `type` and `id`.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### id

`string`

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### generateIdForRecord()?

```ts
optional generateIdForRecord(
   store: Store$1, 
   type: string, 
   properties: unknown
): string;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:425](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L425)

**`Optional`**

This method provides the ability to generate an ID to assign to a new record whenever `store.createRecord`
is called if no `id` was provided.

Alternatively you can pass an id into the call to `store.createRecord` directly.

```js
let id = generateNewId(type);
let newRecord = store.createRecord(type, { id });
```

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### type

`string`

The type (or modelName) of record being created

##### properties

`unknown`

the properties passed as the second arg to `store.createRecord`

#### Returns

`string`

a string ID that should be unique (no other models of `type` in the cache should have this `id`)

***

### groupRecordsForFindMany()?

```ts
optional groupRecordsForFindMany(store: Store$1, snapshots: Snapshot<unknown>[]): Group[];
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:467](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L467)

**`Optional`**

⚠️ This Method is only called if `coalesceFindRequests` is `true`.

This method allows for you to split pending requests for records into multiple `findMany`
requests. It receives an array of snapshots where each snapshot represents a unique record
requested via `store.findRecord` during the most recent `runloop` that was not found in the
cache or needs to be reloaded. It should return an array of groups.

A group is an array of snapshots meant to be fetched together by a single `findMany` request.

By default if this method is not implemented WarpDrive will call `findMany` once with all
requested records as a single group when `coalesceFindRequests` is `true`.

See also `findMany` and `coalesceFindRequests`

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### snapshots

`Snapshot`<`unknown`>\[]

An array of snapshots

#### Returns

`Group`\[]

An array of Snapshot arrays

***

### query()

```ts
query(
   store: Store$1, 
   schema: ModelSchema, 
   query: Record<string, unknown>, 
   recordArray: LegacyQueryArray, 
   options: {
  adapterOptions?: unknown;
}
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:137](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L137)

`adapter.query` takes a request for resources of a given `type` and should return
a `Promise` which fulfills with a collection of resource data matching that `type`.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `query`, which should return a `JSON:API` document.

As with `findAll`, the final result after normalization to `JSON:API` will be added to
store via `store.push` where it will merge with any existing records for `type`.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

`adapter.query` is called whenever `store.query` is called or a previous query result is
asked to reload.

Existing records for the `type` will not be removed. The key difference is in the result
returned by the `store`. For `findAll` the result is all known records of the `type`,
while for `query` it will only be the records returned from `adapter.query`.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### recordArray

`LegacyQueryArray`

##### options

###### adapterOptions?

`unknown`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### queryRecord()

```ts
queryRecord(
   store: Store$1, 
   schema: ModelSchema, 
   query: Record<string, unknown>, 
   options: {
  adapterOptions?: unknown;
}
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:167](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L167)

`adapter.queryRecord` takes a request for resource of a given `type` and should return
a `Promise` which fulfills with data for a single resource matching that `type`.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `queryRecord`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data for the returned record.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### options

###### adapterOptions?

`unknown`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

a promise resolving with resource data to feed to the associated serializer

***

### shouldBackgroundReloadAll()?

```ts
optional shouldBackgroundReloadAll(store: Store$1, snapshotArray: SnapshotRecordArray): boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:567](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L567)

**`Optional`**

When `store.findAll(<type>)` is called and a `reload` is not initiated, the adapter
is presented the opportunity to trigger a new non-blocking (background) request for
records of that type

Users may explicitly declare that this background request should/should not occur by passing
`backgroundReload: true` or `backgroundReload: false` as an option to the request respectively.

```js
store.findAll('user', { backgroundReload: false })
```

The default behavior if this method is not implemented and the option is not specified is to
perform a reload, the same as a return of `true`.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### snapshotArray

`SnapshotRecordArray`

#### Returns

`boolean`

true if the a new request for all records of the type in SnapshotRecordArray should be made in the background, false otherwise

***

### shouldBackgroundReloadRecord()?

```ts
optional shouldBackgroundReloadRecord(store: Store$1, snapshot: Snapshot): boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:544](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L544)

**`Optional`**

When a record is already available in the store and is requested again via `store.findRecord`,
and the record does not need to be reloaded prior to return, this method provides the ability
to specify whether a refresh of the data for the reload should be scheduled to occur in the background.

Users may explicitly declare a record should/should not be background reloaded by passing
`backgroundReload: true` or `backgroundReload: false` as an option to the request respectively.

```js
store.findRecord('user', '1', { backgroundReload: false })
```

If the `backgroundReload` option is not present, this method will be called to determine whether
a backgroundReload should be performed.

The default behavior if this method is not implemented and the option was not specified is to
background reload, the same as a return of `true`.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### snapshot

`Snapshot`

A Snapshot containing the record's current data

#### Returns

`boolean`

true if the record should be reloaded in the background, false otherwise

***

### shouldReloadAll()?

```ts
optional shouldReloadAll(store: Store$1, snapshotArray: SnapshotRecordArray): boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:518](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L518)

**`Optional`**

When `store.findAll(<type>)` is called without a `reload` option, the adapter
is presented the opportunity to trigger a new request for records of that type.

If `reload` is specified as an option in the request (`true` or `false`) this method will not
be called.

```js
store.findAll('user', { reload: false })
```

The default behavior if this method is not implemented and the option is not specified is to
not reload, the same as a return of `false`.

Note: the Promise returned by `store.findAll` resolves to the same LiveArray instance
returned by `store.peekAll` for that type, and will include all records in the store for
the given type, including any previously existing records not returned by the reload request.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### snapshotArray

`SnapshotRecordArray`

#### Returns

`boolean`

true if the a new request for all records of the type in SnapshotRecordArray should be made immediately, false otherwise

***

### shouldReloadRecord()?

```ts
optional shouldReloadRecord(store: Store$1, snapshot: Snapshot): boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:492](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L492)

**`Optional`**

When a record is already available in the store and is requested again via `store.findRecord`,
and `reload` is not specified as an option in the request, this method is called to determine
whether the record should be reloaded prior to returning the result.

If `reload` is specified as an option in the request (`true` or `false`) this method will not
be called.

```js
store.findRecord('user', '1', { reload: false })
```

The default behavior if this method is not implemented and the option is not specified is to
not reload, the same as a return of `false`.

See also the documentation for `shouldBackgroundReloadRecord` which defaults to `true`.

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### snapshot

`Snapshot`

A Snapshot containing the record's current data

#### Returns

`boolean`

true if the record should be reloaded immediately, false otherwise

***

### updateRecord()

```ts
updateRecord(
   store: Store$1, 
   schema: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:275](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L275)

`adapter.updateRecord` takes a request to update a resource of a given `type` and should
return a `Promise` which fulfills with the updated data for the resource.

The response will be fed to the associated serializer's `normalizeResponse` method
with the `requestType` set to `updateRecord`, which should return a `JSON:API` document.

The final result after normalization to `JSON:API` will be added to store via `store.push` where
it will merge with any existing data for the record.

⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
call will NOT be made. In this scenario you may need to do at least a minimum amount of response
processing within the adapter.

If the adapter rejects or throws an error the record will enter an error state and the attributes
that had attempted to be saved will still be considered dirty.

### InvalidErrors

When rejecting a `createRecord` request due to validation issues during save (typically a 422 status code),
you may throw an `InvalidError`.

Throwing an `InvalidError` makes per-attribute errors available for records to use in the UI as needed.
Records can also use this information to mark themselves as being in an `invalid` state.
For more reading [see the RecordData Errors RFC](https://emberjs.github.io/rfcs/0465-record-data-errors.html)

```js
let error = new Error(errorMessage);

// these two properties combined
// alert WarpDrive to this error being for
// invalid properties on the record during
// the request
error.isAdapterError = true;
error.code = 'InvalidError';

// A JSON:API formatted array of errors
// See https://jsonapi.org/format/#errors
error.errors = [];

throw error;
```

#### Parameters

##### store

`Store$1`

The store service that initiated the request being normalized

##### schema

`ModelSchema`

An object with methods for accessing information about
the type, attributes and relationships of the primary type associated with the request.

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](AdapterPayload.md)>

## Properties

### coalesceFindRequests?

```ts
optional coalesceFindRequests?: boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts:444](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/compat/legacy-network-handler/minimum-adapter-interface.ts#L444)

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
