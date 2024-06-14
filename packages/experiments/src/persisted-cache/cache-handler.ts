import type { CacheHandler, Handler, NextFn, RequestContext, StructuredDocument } from '@ember-data/request';
import { StableExistingRecordIdentifier } from '@warp-drive/core-types/identifier';
import { ResourceDocument } from '@warp-drive/core-types/spec/document';

const WarpDriveCacheVersion = 1;

class PersistedCacheFetch implements Handler {
  request<T>(context: RequestContext, next: NextFn<T>) {
    return next(context.request);
  }
}

/**
 * A CacheHandler that wraps another CacheHandler to enable persisted caching
 * of requests and responses.
 */
export class PersistedCacheHandler implements CacheHandler {
  declare _fetch: PersistedCacheFetch;
  declare _handler: CacheHandler;
  declare _db: IDBDatabase | null;
  declare _setup: Promise<void>;

  async _setupCache(): Promise<void> {
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

    this._db = request.result;
  }

  constructor(handler: CacheHandler) {
    this._handler = handler;
    this._db = null;
    this._setup = this._setupCache();
    this._fetch = new PersistedCacheFetch();
  }

  request<T>(context: RequestContext, next: NextFn<T>) {
    const nextFn = ((req: RequestContext['request']) =>
      this._fetch.request(Object.assign({}, context, { request: req }), next)) as NextFn<T>;

    if (!this._db) {
      return this._handler.request(context, nextFn);
    }

    return this._handler.request(context, nextFn);
  }

  _put<T>(doc: StructuredDocument<T> | { content: T }): ResourceDocument {
    const result = this._cache.put(doc);

    if (!result.lid) {
      return result;
    }

    const transaction = this._db.transaction(['request', 'resource'], 'readwrite', { durability: 'relaxed' });
    const request = this._cache.peekRequest({ lid: result.lid })!;

    const requests = transaction.objectStore('request');
    const resources = transaction.objectStore('resource');

    requests.put(request);

    if ('data' in result && result.data) {
      const resourceData: StableExistingRecordIdentifier[] = Array.isArray(result.data) ? result.data : [result.data];
      resourceData.forEach((identifier) => {
        resources.put(this._cache.peek(identifier), identifier.lid);
      });
    }

    if ('included' in result && result.included) {
      const included: StableExistingRecordIdentifier[] = result.included;
      included.forEach((identifier) => {
        resources.put(this._cache.peek(identifier), identifier.lid);
      });
    }

    return result;
  }
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
