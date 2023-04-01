import type {
  Future,
  Handler,
  ImmutableRequestInfo,
  NextFn,
  RequestContext,
  StructuredErrorDocument,
} from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import { CollectionResourceDataDocument, ResourceDataDocument } from '@ember-data/types/cache/document';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

export type HTTPMethod = 'GET' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface LifetimesService {
  isHardExpired(key: string, url: string, method: HTTPMethod): boolean;
  isSoftExpired(key: string, url: string, method: HTTPMethod): boolean;
}

const CacheOperations = new Set([
  'findRecord',
  'findAll',
  'query',
  'queryRecord',
  'findBelongsTo',
  'findHasMany',
  'updateRecord',
  'createRecord',
  'deleteRecord',
]);

export interface StoreRequestInfo extends ImmutableRequestInfo {
  cacheOptions?: { key?: string; reload?: boolean; backgroundReload?: boolean };
  store?: Store;

  op?:
    | 'findRecord'
    | 'updateRecord'
    | 'query'
    | 'queryRecord'
    | 'findAll'
    | 'findBelongsTo'
    | 'findHasMany'
    | 'createRecord'
    | 'deleteRecord'
    | string;
  records?: StableRecordIdentifier[];
}

export interface StoreRequestContext extends RequestContext {
  request: StoreRequestInfo & { store: Store };
}

function getHydratedContent<T>(store: Store, request: StoreRequestInfo, document: ResourceDataDocument): T {
  if (!request.op || !CacheOperations.has(request.op)) {
    return document as T;
  }
  if (Array.isArray(document.data)) {
    const { lid } = document;
    const { recordArrayManager } = store;
    if (!lid) {
      return recordArrayManager.createArray({
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
        query: request,
      }) as T;
    }
    let managed = recordArrayManager._keyedArrays.get(lid);
    if (!managed) {
      managed = recordArrayManager.createArray({
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
      });
      recordArrayManager._keyedArrays.set(lid, managed);
    } else {
      recordArrayManager.populateManagedArray(managed, document.data, document as CollectionResourceDataDocument);
    }
    return managed as T;
  } else {
    switch (request.op) {
      case 'findBelongsTo':
      case 'queryRecord':
      case 'findRecord':
        return Object.assign({}, document, {
          data: document.data ? store.peekRecord(document.data) : null,
        }) as T;
      default:
        return document.data as T;
    }
  }
}

function calcShouldFetch(
  store: Store,
  request: StoreRequestInfo,
  hasCachedValue: boolean,
  lid: string | null | undefined
): boolean {
  const { cacheOptions, url, method } = request;
  return (
    cacheOptions?.reload ||
    !hasCachedValue ||
    (store.lifetimes && lid && url && method ? store.lifetimes.isHardExpired(lid, url, method as HTTPMethod) : false)
  );
}

function calcShouldBackgroundFetch(
  store: Store,
  request: StoreRequestInfo,
  willFetch: boolean,
  lid: string | null | undefined
): boolean {
  const { cacheOptions, url, method } = request;
  return (
    !willFetch &&
    (cacheOptions?.backgroundReload ||
      (store.lifetimes && lid && url && method ? store.lifetimes.isSoftExpired(lid, url, method as HTTPMethod) : false))
  );
}

function fetchContentAndHydrate<T>(
  next: NextFn<T>,
  context: StoreRequestContext,
  shouldFetch: boolean,
  shouldBackgroundFetch: boolean
): Promise<T> {
  const { store } = context.request;
  const shouldHydrate: boolean =
    (context.request[Symbol.for('ember-data:enable-hydration')] as boolean | undefined) || false;
  return next(context.request).then(
    (document) => {
      store._enableAsyncFlush = true;
      let response: ResourceDataDocument;
      store._join(() => {
        response = store.cache.put(document) as ResourceDataDocument;

        if (shouldFetch && shouldHydrate) {
          response = getHydratedContent(store, context.request, response);
        }
      });
      store._enableAsyncFlush = null;

      if (shouldFetch) {
        return response!;
      }
    },
    (error: StructuredErrorDocument) => {
      store._enableAsyncFlush = true;
      store._join(() => {
        store.cache.put(error);
      });
      store._enableAsyncFlush = null;

      // TODO @runspired this is probably not the right thing to throw so make sure we add a test
      if (!shouldBackgroundFetch) {
        throw error;
      }
    }
  ) as Promise<T>;
}

export const CacheHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T> | Future<T> {
    // if we have no cache or no cache-key skip cache handling
    if (!context.request.store || !(context.request.cacheOptions?.key || context.request.url)) {
      return next(context.request);
    }

    const { store } = context.request;
    const { cacheOptions, url, method } = context.request;
    const lid = cacheOptions?.key || (method === 'GET' && url) ? url : null;
    const peeked = lid ? store.cache.peekRequest({ lid }) : null;

    // determine if we should skip cache
    if (calcShouldFetch(store, context.request, !!peeked, lid)) {
      return fetchContentAndHydrate(next, context, true, false);
    }

    // if we have not skipped cache, determine if we should update behind the scenes
    if (calcShouldBackgroundFetch(store, context.request, false, lid)) {
      void fetchContentAndHydrate(next, context, false, true);
    }

    if ('error' in peeked!) {
      throw peeked.error;
    }

    const shouldHydrate: boolean =
      (context.request[Symbol.for('ember-data:enable-hydration')] as boolean | undefined) || false;

    return Promise.resolve(
      shouldHydrate
        ? getHydratedContent<T>(store, context.request, peeked!.content as ResourceDataDocument)
        : (peeked!.content as T)
    );
  },
};
