---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/legacy/adapter/types/BuildURLMixin.md
description: >-
  Legacy adapter mixin providing `buildURL` and the `urlFor*` hooks that turn a
  model name, id, snapshot, and request type into a request URL.
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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:29](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L29)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:44](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L44)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:56](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L56)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:68](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L68)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:81](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L81)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:97](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L97)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:110](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L110)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:123](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L123)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:136](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L136)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:149](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L149)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:162](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L162)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:174](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L174)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:258](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L258)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:231](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L231)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:245](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L245)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:190](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L190)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:224](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L224)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:217](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L217)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:210](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L210)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:184](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L184)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:202](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L202)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:196](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L196)

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

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:238](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L238)

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
