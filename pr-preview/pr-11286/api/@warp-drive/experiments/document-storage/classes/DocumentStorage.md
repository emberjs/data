---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/experiments/document-storage/classes/DocumentStorage.md
---

&#x20;

# &#x20;DocumentStorage

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:407](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/document-storage/index.ts#L407)

DocumentStorage is a wrapper around the StorageManager API that provides
a simple interface for reading and updating documents and requests.

Some goals for this experiment:

* optimize for storing requests/documents
* optimize for storing resources
* optimize for looking up resources associated to a document
* optimize for notifying cross-tab when data is updated

optional features:

* support for offline mode
* ?? support for relationship based cache traversal
* a way to index records by type + another field (e.g updatedAt/createAt/name)
  such that simple queries can be done without having to scan all records

## Constructors

### Constructor

```ts
new DocumentStorage(options?: Partial<DocumentStorageOptions>): DocumentStorage;
```

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:410](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/document-storage/index.ts#L410)

#### Parameters

##### options?

[`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)<`DocumentStorageOptions`> = `{}`

#### Returns

`DocumentStorage`

## Methods

### clear()

```ts
clear(reset?: boolean): Promise<void>;
```

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:448](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/document-storage/index.ts#L448)

#### Parameters

##### reset?

`boolean`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### getDocument()

```ts
getDocument(key: DocumentIdentifier): Promise<CacheDocument | null>;
```

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:430](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/document-storage/index.ts#L430)

#### Parameters

##### key

`DocumentIdentifier`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`CacheDocument` | `null`>

***

### putDocument()

```ts
putDocument(document: CacheFileDocument, resourceCollector: (resourceIdentifier: PersistedResourceKey) => ExistingResourceObject): Promise<void>;
```

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:434](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/document-storage/index.ts#L434)

#### Parameters

##### document

`CacheFileDocument`

##### resourceCollector

(`resourceIdentifier`: [`PersistedResourceKey`](../../../core/types/identifier/types/PersistedResourceKey.md)) => [`ExistingResourceObject`](../../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### putResources()

```ts
putResources(document: ResourceDataDocument, resourceCollector: (resourceIdentifier: PersistedResourceKey) => ExistingResourceObject): Promise<void>;
```

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:441](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/document-storage/index.ts#L441)

#### Parameters

##### document

[`ResourceDataDocument`](../../../core/types/spec/document/types/ResourceDataDocument.md)

##### resourceCollector

(`resourceIdentifier`: [`PersistedResourceKey`](../../../core/types/identifier/types/PersistedResourceKey.md)) => [`ExistingResourceObject`](../../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

## Properties

### \_storage

```ts
readonly _storage: InternalDocumentStorage;
```

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:408](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/experiments/src/document-storage/index.ts#L408)
