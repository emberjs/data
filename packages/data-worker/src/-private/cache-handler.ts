import type { Future, Handler, NextFn, StructuredErrorDocument } from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import {
  ResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  StructuredDocument,
} from '@ember-data/types/cache/document';
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';

import type { DataWorker } from './data-worker';
import { calcShouldBackgroundFetch, calcShouldFetch, type StoreRequestContext } from './utils';

function fetchContent<T>(
  next: NextFn<T>,
  context: StoreRequestContext,
  identifier: StableDocumentIdentifier | null,
  shouldFetch: boolean,
  shouldBackgroundFetch: boolean
): Promise<T> {
  const { store } = context.request;

  return next(context.request).then(
    (document) => {
      store.requestManager._pending.delete(context.id);
      store._enableAsyncFlush = true;
      let response: ResourceDataDocument;
      store._join(() => {
        response = store.cache.put(document) as ResourceDataDocument;
      });
      store._enableAsyncFlush = null;

      if (shouldFetch) {
        return response!;
      } else if (shouldBackgroundFetch) {
        store.notifications._flush();
      }
    },
    (error: StructuredErrorDocument) => {
      store.requestManager._pending.delete(context.id);
      if (context.request.signal?.aborted) {
        throw error;
      }
      store.requestManager._pending.delete(context.id);
      store._enableAsyncFlush = true;
      let response: ResourceErrorDocument;
      store._join(() => {
        response = store.cache.put(error) as ResourceErrorDocument;
      });
      store._enableAsyncFlush = null;

      if (!shouldBackgroundFetch) {
        const newError = cloneError(error);
        newError.content = response!;
        throw newError;
      } else {
        store.notifications._flush();
      }
    }
  ) as Promise<T>;
}

function cloneError(error: Error & { error: string | object }) {
  const cloned: Error & { error: string | object; content: object } = new Error(error.message) as Error & {
    error: string | object;
    content: object;
  };
  cloned.stack = error.stack;
  cloned.error = error.error;
  return cloned;
}

export const SkipCache = Symbol.for('ember-data:skip-cache');
export const EnableHydration = Symbol.for('ember-data:enable-hydration');

async function getRecord<T>(store: IDBObjectStore, key: string): Promise<T | null> {
  const request = store.get(key);
  return new Promise((resolve) => {
    request.onsuccess = () => {
      resolve((request.result as T) || null);
    };
  });
}

export const CacheHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T> | Future<T> {
    // if we have no cache or no cache-key skip cache handling
    // TODO how to handle this across the worker  boundary?
    if (!context.request.store || context.request.cacheOptions?.[SkipCache]) {
      return next(context.request);
    }

    const { store } = context.request;
    const identifier = store.identifierCache.getOrCreateDocumentIdentifier(context.request);

    const peeked = identifier ? store.cache.peekRequest(identifier) : null;

    if (!identifier || peeked) {
      return doRequest(store, context, next, peeked, identifier);
    }

    const worker = (store as unknown as { __dataWorker: DataWorker }).__dataWorker;
    const transaction = worker.db.transaction(['document', 'resource', 'request'], 'readonly', {
      durability: 'relaxed',
    });

    const requestStore = transaction.objectStore('request');

    return getRecord<StructuredDocument<ResourceDocument> | undefined>(requestStore, identifier.lid).then(
      (existing) => {
        if (!existing) {
          return doRequest(store, context, next, false, identifier);
        }

        const resourceStore = transaction.objectStore('resource');

        // put the document into in-mem cache so the lifetimes service can access
        const doc = store.cache.put(existing);
        if (!calcShouldFetch(store, context.request, true, identifier)) {
          // load all associated data into memory
          const promises: Promise<void>[] = [];

          if ('data' in doc) {
            const data = Array.isArray(doc.data) ? doc.data : doc.data ? [doc.data] : [];
            data.forEach((resourceIdentifier) => {
              promises.push(
                getRecord<unknown>(resourceStore, resourceIdentifier.lid).then((resource) => {
                  store.cache.upsert(resourceIdentifier, data, false);
                })
              );
            });
          }

          if ('included' in doc) {
            doc.included.forEach((resourceIdentifier) => {
              promises.push(
                getRecord<unknown>(resourceStore, resourceIdentifier.lid).then((resource) => {
                  store.cache.upsert(resourceIdentifier, data, false);
                })
              );
            });
          }

          return Promise.all(promises).then(
            () => {
              return doRequest(store, context, next, true, identifier);
            },
            (e) => {
              // eslint-disable-next-line no-console
              console.log(`Error retrieving request resources from cache`, e);
              // skip cache
              return doRequest(store, context, next, false, identifier);
            }
          );
        }

        return doRequest(store, context, next, true, identifier);
      },
      (e) => {
        // eslint-disable-next-line no-console
        console.log(`Error retrieving request from cache`, e);
        // skip cache
        return doRequest(store, context, next, false, identifier);
      }
    );
  },
};

function doRequest(
  store: Store,
  context: StoreRequestContext,
  next: NextFn,
  peeked: StructuredDocument<ResourceDocument> | null,
  identifier: StableDocumentIdentifier
) {
  // determine if we should skip cache
  if (calcShouldFetch(store, context.request, !!peeked, identifier)) {
    return fetchContent(next, context, identifier, true, false);
  }

  // if we have not skipped cache, determine if we should update behind the scenes
  if (calcShouldBackgroundFetch(store, context.request, false, identifier)) {
    let promise = fetchContent(next, context, identifier, false, true);
    store.requestManager._pending.set(context.id, promise);
  }

  // TODO probably don't need to throw
  if ('error' in peeked) {
    const newError = cloneError(peeked);
    newError.content = peeked.content as object;
    throw newError;
  }

  return Promise.resolve(peeked.content as T);
}
