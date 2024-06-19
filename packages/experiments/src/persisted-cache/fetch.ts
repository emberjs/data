import type { CacheHandler, Future, Handler, NextFn, RequestContext, StructuredDocument } from '@ember-data/request';
import { getCache } from './db';
import { SkipCache } from '@warp-drive/core-types/request';
import { StoreRequestContext } from '@ember-data/store';
import { ResourceDocument } from '@warp-drive/core-types/spec/document';
import { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';

/**
 * A Handler that resolves requests from the persisted cache.
 */
export class PersistedFetch implements Handler {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Future<T> {
    const identifier = getPossiblyPersistedRequestId(context.request);

    if (!identifier) {
      return next(context.request);
    }

    return getCache().then((db) => {
      return checkCache(db, context, next, identifier);
    });
  }
}

async function checkCache<T>(
  db: IDBDatabase,
  context: StoreRequestContext,
  next: NextFn<T>,
  identifier: StableDocumentIdentifier
): Promise<T> {
  const { store } = context.request;
  const transaction = db.transaction('request', 'readonly');
  const objectStore = transaction.objectStore('request');
  const request = objectStore.get(identifier.lid);

  return new Promise<T>((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = () => {
      const result = request.result as StructuredDocument | undefined;

      if (!result) {
        return next(context.request);
      }

      const document = ResourceDocument.fromJSONAPI(result);
      store.cache.updateRequest(identifier, document);

      resolve(document as T);
    };
  });
}

function getPossiblyPersistedRequestId(request: StoreRequestContext['request']): null | StableDocumentIdentifier {
  const { store, cacheOptions } = request;

  // if there is no store, this is not a request we can resolve from the persisted cache
  if (!store) {
    return null;
  }

  // if this is legacy, this is not a request we can resolve from cache
  if (cacheOptions?.[SkipCache]) {
    return null;
  }

  // if we are told to explicitly reload, this is not a request we can resolve from cache
  // if it is a backgroundReload, we pull existing data from cache and then update it
  // so long as it was not already in-memory so we continue on here.
  // TODO - if we are offline we should consider resolving from cache anyway
  if (cacheOptions?.reload) {
    return null;
  }

  const identifier = store.identifierCache.getOrCreateDocumentIdentifier(request);

  // if there is no cache-key,  this is not a request we can resolve from the persisted from cache
  if (!identifier) {
    return null;
  }

  const peeked = store.cache.peekRequest(identifier);

  // if the request is already in-memory in the cache, this is not a request we should resolve from the persisted from cache
  if (peeked) {
    return null;
  }

  return identifier;
}
