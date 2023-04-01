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
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';

export type HTTPMethod = 'GET' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface LifetimesService {
  isHardExpired(identifier: StableDocumentIdentifier): boolean;
  isSoftExpired(identifier: StableDocumentIdentifier): boolean;
}

export type StoreRequestInfo = ImmutableRequestInfo;

export interface StoreRequestContext extends RequestContext {
  request: StoreRequestInfo & { store: Store };
}

function getHydratedContent<T>(store: Store, request: StoreRequestInfo, document: ResourceDataDocument): T {
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
    return Object.assign({}, document, {
      data: document.data ? store.peekRecord(document.data) : null,
    }) as T;
  }
}

function calcShouldFetch(
  store: Store,
  request: StoreRequestInfo,
  hasCachedValue: boolean,
  identifier: StableDocumentIdentifier | null
): boolean {
  const { cacheOptions } = request;
  return (
    cacheOptions?.reload ||
    !hasCachedValue ||
    (store.lifetimes && identifier ? store.lifetimes.isHardExpired(identifier) : false)
  );
}

function calcShouldBackgroundFetch(
  store: Store,
  request: StoreRequestInfo,
  willFetch: boolean,
  identifier: StableDocumentIdentifier | null
): boolean {
  const { cacheOptions } = request;
  return (
    !willFetch &&
    (cacheOptions?.backgroundReload ||
      (store.lifetimes && identifier ? store.lifetimes.isSoftExpired(identifier) : false))
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
    if (!context.request.store) {
      return next(context.request);
    }

    const { store } = context.request;
    const identifier = store.identifierCache.getOrCreateDocumentIdentifier(context.request);

    const peeked = identifier ? store.cache.peekRequest(identifier) : null;

    // determine if we should skip cache
    if (calcShouldFetch(store, context.request, !!peeked, identifier)) {
      return fetchContentAndHydrate(next, context, true, false);
    }

    // if we have not skipped cache, determine if we should update behind the scenes
    if (calcShouldBackgroundFetch(store, context.request, false, identifier)) {
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
