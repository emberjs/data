---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/experiments/document-storage/classes/DocumentStorage.md
description: >-
  Experimental persistent store for request documents and their resources,
  backed by the Origin Private File System and synced across tabs via
  `BroadcastChannel`.
---

&#x20;

# &#x20;DocumentStorage

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:410](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/document-storage/index.ts#L410)

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

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:413](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/document-storage/index.ts#L413)

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

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:451](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/document-storage/index.ts#L451)

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

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:433](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/document-storage/index.ts#L433)

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

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:437](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/document-storage/index.ts#L437)

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

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:444](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/document-storage/index.ts#L444)

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

Defined in: [warp-drive-packages/experiments/src/document-storage/index.ts:411](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/experiments/src/document-storage/index.ts#L411)
