import type { StructuredDocument } from '@ember-data/request';
import { Cache } from '@warp-drive/core-types/cache';
import type { ResourceDocument } from '@warp-drive/core-types/spec/document';

const WarpDriveCacheVersion = 1;

const GlobalStorage = globalThis as typeof globalThis & {
  __WarpDriveCache?: IDBDatabase;
  __WarpDriveCachePromise?: Promise<IDBDatabase>;
};

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

async function getCachedRequest(
  cache: Cache,
  db: IDBDatabase,
  lid: string
): Promise<StructuredDocument<ResourceDocument> | null> {
  const transaction = db.transaction(['request', 'resource'], 'readonly');
  const objectStore = transaction.objectStore('request');
  const request = objectStore.get(lid);

  const document: StructuredDocument<ResourceDocument> | null = await new Promise((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = () => {
      resolve(request.result);
    };
  });

  if (!document) {
    return null;
  }

  // iterate over data and included, for any resource that is not in the cache, fetch it
  // from the persisted cache and add it to the response.
  // if any resource is not in the cache, return null
  // otherwise, return the document
  // TODO consider throwing an error if a resource is not in the cache
  // as this would indicate a bug in the cache implementation

  return document;
}
