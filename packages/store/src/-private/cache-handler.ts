/**
 * @module @ember-data/store
 */
import { assert } from '@ember/debug';

import type { Future, Handler, NextFn } from '@ember-data/request/-private/types';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';
import type {
  ImmutableCreateRequestOptions,
  ImmutableDeleteRequestOptions,
  ImmutableRequestInfo,
  ImmutableUpdateRequestOptions,
  RequestContext,
  ResponseInfo,
  StructuredDataDocument,
  StructuredErrorDocument,
} from '@warp-drive/core-types/request';
import { EnableHydration, SkipCache } from '@warp-drive/core-types/request';
import type {
  CollectionResourceDataDocument,
  ResourceDataDocument,
  ResourceErrorDocument,
} from '@warp-drive/core-types/spec/document';
import type { ApiError } from '@warp-drive/core-types/spec/error';
import type { ResourceIdentifierObject } from '@warp-drive/core-types/spec/raw';

import type { RecordInstance } from '../-types/q/record-instance';
import { Document } from './document';
import type Store from './store-service';

/**
 * A service which an application may provide to the store via
 * the store's `lifetimes` property to configure the behavior
 * of the CacheHandler.
 *
 * The default behavior for request lifetimes is to never expire
 * unless manually refreshed via `cacheOptions.reload` or `cacheOptions.backgroundReload`.
 *
 * Implementing this service allows you to programatically define
 * when a request should be considered expired.
 *
 * @class <Interface> LifetimesService
 * @public
 */
export interface LifetimesService {
  /**
   * Invoked to determine if the request may be fulfilled from cache
   * if possible.
   *
   * Note, this is only invoked if the request has a cache-key.
   *
   * If no cache entry is found or the entry is hard expired,
   * the request will be fulfilled from the configured request handlers
   * and the cache will be updated before returning the response.
   *
   * @method isHardExpired
   * @public
   * @param {StableDocumentIdentifier} identifier
   * @param {Store} store
   * @return {boolean} true if the request is considered hard expired
   */
  isHardExpired(identifier: StableDocumentIdentifier, store: Store): boolean;
  /**
   * Invoked if `isHardExpired` is false to determine if the request
   * should be update behind the scenes if cache data is already available.
   *
   * Note, this is only invoked if the request has a cache-key.
   *
   * If true, the request will be fulfilled from cache while a backgrounded
   * request is made to update the cache via the configured request handlers.
   *
   * @method isSoftExpired
   * @public
   * @param {StableDocumentIdentifier} identifier
   * @param {Store} store
   * @return {boolean} true if the request is considered soft expired
   */
  isSoftExpired(identifier: StableDocumentIdentifier, store: Store): boolean;

  /**
   * Invoked when a request will be sent to the configured request handlers.
   * This is invoked for both foreground and background requests.
   *
   * Note, this is invoked regardless of whether the request has a cache-key.
   *
   * @method willRequest [Optional]
   * @public
   * @param {ImmutableRequestInfo} request
   * @param {StableDocumentIdentifier | null} identifier
   * @param {Store} store
   * @return {void}
   */
  willRequest?(request: ImmutableRequestInfo, identifier: StableDocumentIdentifier | null, store: Store): void;

  /**
   * Invoked when a request has been fulfilled from the configured request handlers.
   * This is invoked for both foreground and background requests once the cache has
   * been updated.
   *
   * Note, this is invoked regardless of whether the request has a cache-key.
   *
   * @method didRequest [Optional]
   * @public
   * @param {ImmutableRequestInfo} request
   * @param {ImmutableResponse} response
   * @param {StableDocumentIdentifier | null} identifier
   * @param {Store} store
   * @return {void}
   */
  didRequest?(
    request: ImmutableRequestInfo,
    response: Response | ResponseInfo | null,
    identifier: StableDocumentIdentifier | null,
    store: Store
  ): void;
}

export type StoreRequestInfo = ImmutableRequestInfo;
export type LooseStoreRequestInfo = Omit<StoreRequestInfo, 'records' | 'headers'> & {
  records?: ResourceIdentifierObject[];
  headers?: Headers;
};

export type StoreRequestInput = StoreRequestInfo | LooseStoreRequestInfo;

export interface StoreRequestContext extends RequestContext {
  request: StoreRequestInfo & { store: Store; [EnableHydration]?: boolean };
}

const MUTATION_OPS = new Set(['createRecord', 'updateRecord', 'deleteRecord']);

function isErrorDocument(document: ResourceDataDocument | ResourceErrorDocument): document is ResourceErrorDocument {
  return 'errors' in document;
}

function maybeUpdateUiObjects<T>(
  store: Store,
  request: StoreRequestInfo,
  options: {
    shouldHydrate?: boolean;
    shouldFetch?: boolean;
    shouldBackgroundFetch?: boolean;
    identifier: StableDocumentIdentifier | null;
  },
  document: ResourceDataDocument | ResourceErrorDocument,
  isFromCache: boolean
): T {
  const { identifier } = options;

  if (isErrorDocument(document)) {
    if (!identifier && !options.shouldHydrate) {
      return document as T;
    }
    let doc: Document<undefined> | undefined;
    if (identifier) {
      doc = store._documentCache.get(identifier) as Document<undefined> | undefined;
    }

    if (!doc) {
      doc = new Document<undefined>(store, identifier);
      copyDocumentProperties(doc, document);

      if (identifier) {
        store._documentCache.set(identifier, doc);
      }
    } else if (!isFromCache) {
      doc.data = undefined;
      copyDocumentProperties(doc, document);
    }

    return options.shouldHydrate ? (doc as T) : (document as T);
  }

  if (Array.isArray(document.data)) {
    const { recordArrayManager } = store;
    if (!identifier) {
      if (!options.shouldHydrate) {
        return document as T;
      }
      const data = recordArrayManager.createArray({
        type: request.url,
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
        query: request,
      }) as T;

      const doc = new Document(store, null);
      doc.data = data;
      doc.meta = document.meta;
      doc.links = document.links;

      return doc as T;
    }
    let managed = recordArrayManager._keyedArrays.get(identifier.lid);

    if (!managed) {
      managed = recordArrayManager.createArray({
        type: identifier.lid,
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
      });
      recordArrayManager._keyedArrays.set(identifier.lid, managed);
      const doc = new Document<RecordInstance[]>(store, identifier);
      doc.data = managed;
      doc.meta = document.meta;
      doc.links = document.links;
      store._documentCache.set(identifier, doc);

      return options.shouldHydrate ? (doc as T) : (document as T);
    } else {
      const doc = store._documentCache.get(identifier)!;
      if (!isFromCache) {
        recordArrayManager.populateManagedArray(managed, document.data, document as CollectionResourceDataDocument);
        doc.data = managed;
        doc.meta = document.meta;
        doc.links = document.links;
      }

      return options.shouldHydrate ? (doc as T) : (document as T);
    }
  } else {
    if (!identifier && !options.shouldHydrate) {
      return document as T;
    }
    const data = document.data ? store.peekRecord(document.data) : null;
    let doc: Document<RecordInstance | null> | undefined;
    if (identifier) {
      doc = store._documentCache.get(identifier);
    }

    if (!doc) {
      doc = new Document<RecordInstance | null>(store, identifier);
      doc.data = data;
      copyDocumentProperties(doc, document);

      if (identifier) {
        store._documentCache.set(identifier, doc);
      }
    } else if (!isFromCache) {
      doc.data = data;
      copyDocumentProperties(doc, document);
    }

    return options.shouldHydrate ? (doc as T) : (document as T);
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
    (request.op && MUTATION_OPS.has(request.op)) ||
    cacheOptions?.reload ||
    !hasCachedValue ||
    (store.lifetimes && identifier ? store.lifetimes.isHardExpired(identifier, store) : false)
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
      (store.lifetimes && identifier ? store.lifetimes.isSoftExpired(identifier, store) : false))
  );
}

function isMutation(
  request: Partial<StoreRequestInfo>
): request is ImmutableUpdateRequestOptions | ImmutableCreateRequestOptions | ImmutableDeleteRequestOptions {
  return Boolean(request.op && MUTATION_OPS.has(request.op));
}

function fetchContentAndHydrate<T>(
  next: NextFn<T>,
  context: StoreRequestContext,
  identifier: StableDocumentIdentifier | null,
  shouldFetch: boolean,
  shouldBackgroundFetch: boolean
): Promise<T> {
  const { store } = context.request;
  const shouldHydrate: boolean = (context.request[EnableHydration] as boolean | undefined) || false;

  let isMut = false;
  if (isMutation(context.request)) {
    isMut = true;
    // TODO should we handle multiple records in request.records by iteratively calling willCommit for each
    const record = context.request.data?.record || context.request.records?.[0];
    assert(`Expected to receive a list of records included in the ${context.request.op} request`, record);
    store.cache.willCommit(record, context);
  }

  if (store.lifetimes?.willRequest) {
    store.lifetimes.willRequest(context.request, identifier, store);
  }

  const promise = next(context.request).then(
    (document) => {
      store.requestManager._pending.delete(context.id);
      store._enableAsyncFlush = true;
      let response: ResourceDataDocument;
      store._join(() => {
        if (isMutation(context.request)) {
          const record = context.request.data?.record || context.request.records?.[0];
          response = store.cache.didCommit(record, document) as ResourceDataDocument;
        } else {
          response = store.cache.put(document) as ResourceDataDocument;
        }
        response = maybeUpdateUiObjects(
          store,
          context.request,
          { shouldHydrate, shouldFetch, shouldBackgroundFetch, identifier },
          response,
          false
        );
      });
      store._enableAsyncFlush = null;

      if (store.lifetimes?.didRequest) {
        store.lifetimes.didRequest(context.request, document.response, identifier, store);
      }

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
      let response: ResourceErrorDocument | undefined;
      store._join(() => {
        if (isMutation(context.request)) {
          // TODO similar to didCommit we should spec this to be similar to cache.put for handling full response
          // currently we let the response remain undefiend.
          const errors =
            error &&
            error.content &&
            typeof error.content === 'object' &&
            'errors' in error.content &&
            Array.isArray(error.content.errors)
              ? (error.content.errors as ApiError[])
              : undefined;

          const record = context.request.data?.record || context.request.records?.[0];

          store.cache.commitWasRejected(record, errors);
          // re-throw the original error to preserve `errors` property.
          throw error;
        } else {
          response = store.cache.put(error) as ResourceErrorDocument;
          response = maybeUpdateUiObjects(
            store,
            context.request,
            { shouldHydrate, shouldFetch, shouldBackgroundFetch, identifier },
            response,
            false
          );
        }
      });
      store._enableAsyncFlush = null;

      if (identifier && store.lifetimes?.didRequest) {
        store.lifetimes.didRequest(context.request, error.response, identifier, store);
      }

      if (!shouldBackgroundFetch) {
        const newError = cloneError(error);
        newError.content = response;
        throw newError;
      } else {
        store.notifications._flush();
      }
    }
  ) as Promise<T>;

  if (!isMut) {
    return promise;
  }
  assert(`Expected a mutation`, isMutation(context.request));

  // for mutations we need to enqueue the promise with the requestStateService
  // TODO should we enque a request per record in records?
  const record = context.request.data?.record || context.request.records?.[0];

  return store._requestCache._enqueue(promise, {
    data: [{ op: 'saveRecord', recordIdentifier: record, options: undefined }],
  });
}

function cloneError(error: Error & { error: string | object }) {
  const cloned: Error & { error: string | object; content?: object } = new Error(error.message) as Error & {
    error: string | object;
    content?: object;
  };
  cloned.stack = error.stack;
  cloned.error = error.error;
  return cloned;
}

export const CacheHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T | StructuredDataDocument<T>> | Future<T> {
    // if we have no cache or no cache-key skip cache handling
    if (!context.request.store || context.request.cacheOptions?.[SkipCache]) {
      return next(context.request);
    }

    const { store } = context.request;
    const identifier = store.identifierCache.getOrCreateDocumentIdentifier(context.request);

    const peeked = identifier ? store.cache.peekRequest(identifier) : null;

    // determine if we should skip cache
    if (calcShouldFetch(store, context.request, !!peeked, identifier)) {
      return fetchContentAndHydrate(next, context, identifier, true, false);
    }

    // if we have not skipped cache, determine if we should update behind the scenes
    if (calcShouldBackgroundFetch(store, context.request, false, identifier)) {
      const promise = fetchContentAndHydrate(next, context, identifier, false, true);
      store.requestManager._pending.set(context.id, promise);
    }

    const shouldHydrate: boolean = (context.request[EnableHydration] as boolean | undefined) || false;

    if ('error' in peeked!) {
      const content = shouldHydrate
        ? maybeUpdateUiObjects<T>(
            store,
            context.request,
            { shouldHydrate, identifier },
            peeked.content as ResourceErrorDocument,
            true
          )
        : peeked.content;
      const newError = cloneError(peeked);
      newError.content = content as object;
      throw newError;
    }

    return Promise.resolve(
      shouldHydrate
        ? maybeUpdateUiObjects<T>(
            store,
            context.request,
            { shouldHydrate, identifier },
            peeked!.content as ResourceDataDocument,
            true
          )
        : (peeked!.content as T)
    );
  },
};

function copyDocumentProperties(target: { links?: unknown; meta?: unknown; errors?: unknown }, source: object) {
  if ('links' in source) {
    target.links = source.links;
  }
  if ('meta' in source) {
    target.meta = source.meta;
  }
  if ('errors' in source) {
    target.errors = source.errors;
  }
}
