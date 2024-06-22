import type {
  Future,
  Handler,
  ImmutableRequestInfo,
  NextFn,
  StructuredDataDocument,
  StructuredErrorDocument,
} from '@ember-data/request';
import { getCache, getCachedRequest } from './db';
import { SkipCache } from '@warp-drive/core-types/request';
import Store, { StoreRequestContext } from '@ember-data/store';
import { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';

/**
 * A Handler that resolves requests from the persisted cache.
 */
export class PersistedFetch implements Handler {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Future<T> | Promise<StructuredDataDocument<T>> {
    const identifier = getPossiblyPersistedRequestId(context.request);

    if (!identifier) {
      return next(context.request);
    }

    return getCache()
      .then((db) => {
        return getCachedRequest(db, identifier.lid);
      })
      .then(
        (cached) => {
          // if there is no cached value, we should still try to resolve
          // from the network
          if (!cached) {
            return next(context.request);
          }

          // add our cache header
          cached.request.headers?.append('X-WarpDrive-Cache', 'IndexedDB');

          // if there is a cached value, we insert it into the memory cache
          // and then check the CachePolicy
          const { store } = context.request;
          store.cache.put(cached);

          // determine if we are a foreground or background fetch
          const shouldFetch = calcShouldFetch(store, context.request, true, identifier);
          if (shouldFetch) {
            return next(context.request);
          }

          // trigger a background load if necessary
          const shouldBackgroundFetch = calcShouldBackgroundFetch(store, context.request, shouldFetch, identifier);
          if (shouldBackgroundFetch) {
            void Promise.resolve().then(() => {
              return next(context.request)
                .then((response) => {
                  if (response) {
                    store.cache.put(response);
                  }
                })
                .catch((error) => {
                  // if there is an error fetching from the network,
                  // we ignore it for now.
                });
            });
          }

          // eagerly return the data we did have
          // throwing if it was an error document
          if ('error' in cached) {
            // TODO we may need to instantiate some errors here since this
            // is getting pulled from the cache
            //
            // even if it were persisted as an Error its likely not from the
            // same domain and won't pass instanceof checks
            throw cached as StructuredErrorDocument;
          }

          return cached as StructuredDataDocument<T>;
        },
        (_error) => {
          // if there is an error fetching from cache,
          // we should still try to resolve from the network
          return next(context.request);
        }
      );
  }
}

const MUTATION_OPS = new Set(['createRecord', 'updateRecord', 'deleteRecord']);
function calcShouldFetch(
  store: Store,
  request: ImmutableRequestInfo,
  hasCachedValue: boolean,
  identifier: StableDocumentIdentifier | null
): boolean {
  const { cacheOptions } = request;
  return (
    (request.op && MUTATION_OPS.has(request.op)) ||
    cacheOptions?.reload ||
    !hasCachedValue ||
    (store.lifetimes && identifier ? store.lifetimes.isHardExpired(identifier, store) : false)
  );
}

function calcShouldBackgroundFetch(
  store: Store,
  request: ImmutableRequestInfo,
  willFetch: boolean,
  identifier: StableDocumentIdentifier | null
): boolean {
  const { cacheOptions } = request;
  return (
    !willFetch &&
    (cacheOptions?.backgroundReload ||
      (store.lifetimes && identifier ? store.lifetimes.isSoftExpired(identifier, store) : false))
  );
}

function getPossiblyPersistedRequestId(request: StoreRequestContext['request']): null | StableDocumentIdentifier {
  const { store, cacheOptions } = request;

  // if there is no store, this is not a request we can resolve from the persisted cache
  if (!store) {
    return null;
  }

  // if this is a mutation, we never want to resolve from cache
  // TODO - for offline mode we should consider some form of persisted-queue
  if (request.op && MUTATION_OPS.has(request.op)) {
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
