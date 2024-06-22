import type { StructuredDocument } from '@ember-data/request';
import Store from '@ember-data/store';
import { assert } from '@warp-drive/build-config/macros';
import { Cache } from '@warp-drive/core-types/cache';
import { ExistingRecordIdentifier, StableExistingRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { ResourceDocument } from '@warp-drive/core-types/spec/document';
import { ExistingResourceObject, ResourceObject } from '@warp-drive/core-types/spec/json-api-raw';

const WarpDriveCacheVersion = 1;

const GlobalStorage = globalThis as typeof globalThis & {
  __WarpDriveCache?: IDBDatabase;
  __WarpDriveCachePromise?: Promise<IDBDatabase>;
};

/**
 * Retrieve the configured IndexedDB database instance
 *
 * @typedoc
 */
export async function getCache(): Promise<IDBDatabase> {
  if (GlobalStorage.__WarpDriveCache) {
    return GlobalStorage.__WarpDriveCache;
  }

  if (GlobalStorage.__WarpDriveCachePromise) {
    return GlobalStorage.__WarpDriveCachePromise;
  }

  try {
    const db = await setupCache();
    GlobalStorage.__WarpDriveCache = db;
    return db;
  } finally {
    GlobalStorage.__WarpDriveCachePromise = undefined;
  }
}

/**
 * Open the IndexedDB database and create the necessary object stores
 * for the cache. Running this function will run upgrades on the database
 * if necessary.
 *
 * @typedoc
 */
async function setupCache(): Promise<IDBDatabase> {
  const request = indexedDB.open('WarpDriveCache', WarpDriveCacheVersion);

  await new Promise((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = resolve;

    /*
      We don't attach an onblocked or onversion handler currently
      because we currently only have one version and
      its unlikely we ever need another version. Even if we
      do need multiple versions, if we end up using a SharedWebWorker
      as intended only one db connection would ever be available.
    */

    request.onupgradeneeded = async (event: IDBVersionChangeEvent) => {
      if (!event.target) {
        throw new Error('Unable to upgrade IndexedDB database for PersistedCache: no target on event.');
      }
      const result: IDBDatabase = (event.target as unknown as { result: IDBDatabase }).result;

      if (!result) {
        throw new Error(
          'Unable to upgrade IndexedDB database for PersistedCache: no IDBDatabase present on `event.target.result`'
        );
      }
      // its not clear from the docs if (1) this method can be a promise or (2) how things like oncomplete
      // for createObjectStore are handled.
      await upgradeCache(result, event.oldVersion);
      // resolve();
    };
  });

  return request.result;
}

/**
 * Perform the necessary migrations to upgrade the database
 *
 * @typedoc
 */
async function upgradeCache(db: IDBDatabase, oldVersion: number): Promise<void> {
  const promises: Promise<void>[] = [];

  if (oldVersion < 1) {
    // const documentStore = db.createObjectStore('document', { keyPath: 'lid', autoIncrement: false });
    const resourceStore = db.createObjectStore('resource', { keyPath: 'lid', autoIncrement: false });
    const requestStore = db.createObjectStore('request', { keyPath: 'lid', autoIncrement: false });

    promises.push(
      // new Promise((resolve) => {
      //   documentStore.transaction.oncomplete = resolve;
      // }),
      new Promise((resolve) => {
        // @ts-expect-error - TS doesn't accept that resolve works here
        resourceStore.transaction.oncomplete = resolve;
      }),
      new Promise((resolve) => {
        // @ts-expect-error - TS doesn't accept that resolve works here
        requestStore.transaction.oncomplete = resolve;
      })
    );
  }

  await Promise.all(promises);
}

/**
 * Retrieve a previously cached request from the IndexedDB database
 * if one exists.
 *
 * If the request is found, the associated resources will also be
 * loaded from the cache and added to the response.
 *
 * If any resource is not found in the cache, the result will be null.
 *
 * @typedoc
 */
export async function getCachedRequest(
  db: IDBDatabase,
  lid: string
): Promise<StructuredDocument<ResourceDocument<ExistingResourceObject & ExistingRecordIdentifier>> | null> {
  const transaction = db.transaction(['request', 'resource'], 'readonly', { durability: 'relaxed' });
  const objectStore = transaction.objectStore('request');
  const request = objectStore.get(lid);

  const document: StructuredDocument<ResourceDocument<ExistingResourceObject & ExistingRecordIdentifier>> | null =
    await new Promise((resolve, reject) => {
      request.onerror = reject;
      request.onsuccess = () => {
        resolve(request.result);
      };
    });

  if (!document) {
    transaction.commit();
    return null;
  }

  // iterate over data and included, for any resource that is not in the cache, fetch it
  // from the persisted cache and add it to the response.
  // if any resource is not in the cache, return null
  // otherwise, return the document
  // throwing an error if a resource is not in the cache
  // as this would indicate a bug in the cache implementation
  const { content } = document;
  const resourceStore = transaction.objectStore('resource');
  let dataPromise;
  let includedPromise;

  // we don't await data loading here because we want to run these in parallel
  if (content && 'data' in content && content.data) {
    if (Array.isArray(content.data)) {
      dataPromise = getCachedResources(resourceStore, content.data);
    } else {
      dataPromise = getCachedResource(resourceStore, content.data);
    }
  }

  // we don't await included loading here because we want to run these in parallel
  if (content && 'included' in content && content.included) {
    includedPromise = getCachedResources(resourceStore, content.included);
  }

  try {
    if (dataPromise) {
      // @ts-expect-error - we know we are not a meta document if data is present
      content.data = await dataPromise;
    }
    if (includedPromise) {
      // @ts-expect-error - we know we are not a meta document if included is present
      content.included = await includedPromise;
    }
  } catch (error) {
    assert(error instanceof Error ? error.message : (error as string), error);

    transaction.commit();
    return null;
  }

  transaction.commit();
  return document;
}

function getCachedResources(
  resourceStore: IDBObjectStore,
  identifiers: ExistingRecordIdentifier[]
): Promise<Array<ExistingResourceObject & ExistingRecordIdentifier>> {
  const promises = identifiers.map((identifier) => getCachedResource(resourceStore, identifier));
  return Promise.all(promises);
}

function getCachedResource(
  resourceStore: IDBObjectStore,
  identifier: ExistingRecordIdentifier
): Promise<ExistingResourceObject & ExistingRecordIdentifier> {
  const request = resourceStore.get(identifier.lid);
  return new Promise((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = () => {
      if (!request.result) {
        reject(
          new Error(`Resource '${identifier.type}' with id '${identifier.id}' was not found in the persisted-cache`)
        );
      } else {
        resolve(request.result);
      }
    };
  });
}
