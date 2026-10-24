---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/adapter/types/BuildURLMixin.md
---

&#x20;

# &#x20;BuildURLMixin

```ts
interface BuildURLMixin {
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot, requestType: "findRecord"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: null, snapshot: SnapshotRecordArray, requestType: "findAll"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: null, snapshot: null, requestType: "query", query: Record<string, unknown>): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: null, snapshot: null, requestType: "queryRecord", query: Record<string, unknown>): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string[], snapshot: Snapshot<unknown>[], requestType: "findMany"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot, requestType: "findHasMany"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot, requestType: "findBelongsTo"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string | null, snapshot: Snapshot, requestType: "createRecord"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot, requestType: "updateRecord"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot, requestType: "deleteRecord"): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot): string;
  pathForType(this: MixtBuildURLMixin, modelName: string): string;
  urlForCreateRecord(this: MixtBuildURLMixin, modelName: string, snapshot: Snapshot): string;
  urlForDeleteRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForFindAll(this: MixtBuildURLMixin, modelName: string, snapshots: SnapshotRecordArray): string;
  urlForFindBelongsTo(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForFindHasMany(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForFindMany(this: MixtBuildURLMixin, ids: string[], modelName: string, snapshots: Snapshot<unknown>[]): string;
  urlForFindRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForQuery(this: MixtBuildURLMixin, query: Record<string, unknown>, modelName: string): string;
  urlForQueryRecord(this: MixtBuildURLMixin, query: Record<string, unknown>, modelName: string): string;
  urlForUpdateRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
}
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:26](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L26)

The methods provided by the `BuildURLMixin` mixin (see the exported
`BuildURLMixin` Mixin below).

See also MixtBuildURLMixin, the interface used to type `this`
within these methods.

## Methods

### buildURL()

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: SnapshotRecordArray, 
   requestType: "findAll"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "query", 
   query: Record<string, unknown>
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "queryRecord", 
   query: Record<string, unknown>
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string[], 
   snapshot: Snapshot<unknown>[], 
   requestType: "findMany"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findHasMany"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findBelongsTo"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string | null, 
   snapshot: Snapshot, 
   requestType: "createRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "updateRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "deleteRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot
): string;
```

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:41](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L41)

Builds a URL for a given type and optional ID.

By default, it pluralizes the type's name (for example, 'post'
becomes 'posts' and 'person' becomes 'people'). To override the
pluralization see [pathForType](#pathfortype).

If an ID is specified, it adds the ID to the path generated
for the type, separated by a `/`.

This overload builds the URL for a `store.findRecord(type, id)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"findRecord"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: SnapshotRecordArray, 
   requestType: "findAll"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:53](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L53)

Builds the URL for a `store.findAll(type)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`null`

###### snapshot

`SnapshotRecordArray`

###### requestType

`"findAll"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "query", 
   query: Record<string, unknown>
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:65](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L65)

Builds the URL for a `store.query(type, query)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`null`

###### snapshot

`null`

###### requestType

`"query"`

###### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "queryRecord", 
   query: Record<string, unknown>
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:78](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L78)

Builds the URL for a `store.queryRecord(type, query)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`null`

###### snapshot

`null`

###### requestType

`"queryRecord"`

###### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string[], 
   snapshot: Snapshot<unknown>[], 
   requestType: "findMany"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:94](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L94)

Builds the URL for coalescing multiple `store.findRecord(type, id)`
records into 1 request when the adapter's `coalesceFindRequests`
property is `true`. The `id` and `snapshot` parameters will be
arrays of ids and snapshots.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`\[]

###### snapshot

`Snapshot`<`unknown`>\[]

###### requestType

`"findMany"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findHasMany"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:107](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L107)

Builds the URL for fetching an async `hasMany` relationship when a
URL is not provided by the server.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"findHasMany"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findBelongsTo"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:120](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L120)

Builds the URL for fetching an async `belongsTo` relationship when a
URL is not provided by the server.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"findBelongsTo"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string | null, 
   snapshot: Snapshot, 
   requestType: "createRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:133](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L133)

Builds the URL for a `record.save()` call when the record was
created locally using `store.createRecord()`.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string` | `null`

###### snapshot

`Snapshot`

###### requestType

`"createRecord"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "updateRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:146](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L146)

Builds the URL for a `record.save()` call when the record has been
updated locally.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"updateRecord"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "deleteRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:159](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L159)

Builds the URL for a `record.save()` call when the record has been
deleted locally.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"deleteRecord"`

##### Returns

`string`

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:171](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L171)

Builds a URL for a given type and ID without a specific request type.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

##### Returns

`string`

***

### pathForType()

```ts
pathForType(this: MixtBuildURLMixin, modelName: string): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:255](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L255)

Determines the pathname for a given type.

By default, it pluralizes the type's name (for example, 'post'
becomes 'posts' and 'person' becomes 'people').

#### Parameters

##### this

`MixtBuildURLMixin`

##### modelName

`string`

#### Returns

`string`

***

### urlForCreateRecord()

```ts
urlForCreateRecord(
   this: MixtBuildURLMixin, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:228](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L228)

Builds a URL for a `record.save()` call when the record was created
locally using `store.createRecord()`.

#### Parameters

##### this

`MixtBuildURLMixin`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

***

### urlForDeleteRecord()

```ts
urlForDeleteRecord(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:242](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L242)

Builds a URL for a `record.save()` call when the record has been
deleted locally.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

***

### urlForFindAll()

```ts
urlForFindAll(
   this: MixtBuildURLMixin, 
   modelName: string, 
   snapshots: SnapshotRecordArray
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:187](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L187)

Builds a URL for a `store.findAll(type)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### modelName

`string`

##### snapshots

`SnapshotRecordArray`

#### Returns

`string`

***

### urlForFindBelongsTo()

```ts
urlForFindBelongsTo(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:221](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L221)

Builds a URL for fetching an async `belongsTo` relationship when a
URL is not provided by the server.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

***

### urlForFindHasMany()

```ts
urlForFindHasMany(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:214](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L214)

Builds a URL for fetching an async `hasMany` relationship when a
URL is not provided by the server.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

***

### urlForFindMany()

```ts
urlForFindMany(
   this: MixtBuildURLMixin, 
   ids: string[], 
   modelName: string, 
   snapshots: Snapshot<unknown>[]
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:207](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L207)

Builds a URL for coalescing multiple `store.findRecord(type, id)`
records into 1 request when the adapter's `coalesceFindRequests`
property is `true`.

#### Parameters

##### this

`MixtBuildURLMixin`

##### ids

`string`\[]

##### modelName

`string`

##### snapshots

`Snapshot`<`unknown`>\[]

#### Returns

`string`

***

### urlForFindRecord()

```ts
urlForFindRecord(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:181](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L181)

Builds a URL for a `store.findRecord(type, id)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

***

### urlForQuery()

```ts
urlForQuery(
   this: MixtBuildURLMixin, 
   query: Record<string, unknown>, 
   modelName: string
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:199](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L199)

Builds a URL for a `store.query(type, query)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### modelName

`string`

#### Returns

`string`

***

### urlForQueryRecord()

```ts
urlForQueryRecord(
   this: MixtBuildURLMixin, 
   query: Record<string, unknown>, 
   modelName: string
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:193](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L193)

Builds a URL for a `store.queryRecord(type, query)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### modelName

`string`

#### Returns

`string`

***

### urlForUpdateRecord()

```ts
urlForUpdateRecord(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:235](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L235)

Builds a URL for a `record.save()` call when the record has been
updated locally.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`
