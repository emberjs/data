/**
 * @module @ember-data/store
 */
import type { CacheHandler as CacheHandlerType, Future, NextFn } from '@ember-data/request';
import type { ManagedRequestPriority } from '@ember-data/request/-private/types';
import { assert } from '@warp-drive/build-config/macros';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';
import type {
  ImmutableRequestInfo,
  RequestContext,
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
import type { ResourceIdentifierObject } from '@warp-drive/core-types/spec/json-api-raw';

import { Document } from '../document';
import type { Store } from '../store-service';
import {
  calcShouldBackgroundFetch,
  calcShouldFetch,
  cloneError,
  copyDocumentProperties,
  getPriority,
  isCacheAffecting,
  isErrorDocument,
  isMutation,
} from './utils';

export type LooseStoreRequestInfo<T = unknown, RT = unknown> = Omit<
  ImmutableRequestInfo<T, RT>,
  'records' | 'headers'
> & {
  records?: ResourceIdentifierObject[];
  headers?: Headers;
};

export type StoreRequestInput<T = unknown, RT = unknown> = ImmutableRequestInfo<T, RT> | LooseStoreRequestInfo<T, RT>;

export interface StoreRequestContext extends RequestContext {
  request: ImmutableRequestInfo & { store: Store; [EnableHydration]?: boolean };
}

/**
 * A CacheHandler that adds support for using an EmberData Cache with a RequestManager.
 *
 * This handler will only run when a request has supplied a `store` instance. Requests
 * issued by the store via `store.request()` will automatically have the `store` instance
 * attached to the request.
 *
 * ```ts
 * requestManager.request({
 *   store: store,
 *   url: '/api/posts',
 *   method: 'GET'
 * });
 * ```
 *
 * When this handler elects to handle a request, it will return the raw `StructuredDocument`
 * unless the request has `[EnableHydration]` set to `true`. In this case, the handler will
 * return a `Document` instance that will automatically update the UI when the cache is updated
 * in the future and will hydrate any identifiers in the StructuredDocument into Record instances.
 *
 * When issuing a request via the store, [EnableHydration] is automatically set to `true`. This
 * means that if desired you can issue requests that utilize the cache without needing to also
 * utilize Record instances if desired.
 *
 * Said differently, you could elect to issue all requests via a RequestManager, without ever using
 * the store directly, by setting [EnableHydration] to `true` and providing a store instance. Not
 * necessarily the most useful thing, but the decoupled nature of the RequestManager and incremental-feature
 * approach of EmberData allows for this flexibility.
 *
 * ```ts
 * import { EnableHydration } from '@warp-drive/core-types/request';
 *
 * requestManager.request({
 *   store: store,
 *   url: '/api/posts',
 *   method: 'GET',
 *   [EnableHydration]: true
 * });
 *
 * @typedoc
 */
export const CacheHandler: CacheHandlerType = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T | StructuredDataDocument<T>> | Future<T> | T {
    // if we have no cache or no cache-key skip cache handling
    if (!context.request.store || context.request.cacheOptions?.[SkipCache]) {
      return next(context.request);
    }

    const { store } = context.request;
    const identifier = store.identifierCache.getOrCreateDocumentIdentifier(context.request);

    // used to dedupe existing requests that match
    const DEDUPE = store.requestManager._deduped;
    const activeRequest = identifier && DEDUPE.get(identifier);
    const peeked = identifier ? store.cache.peekRequest(identifier) : null;

    // determine if we should skip cache
    if (calcShouldFetch(store, context.request, !!peeked, identifier)) {
      if (activeRequest) {
        activeRequest.priority = { blocking: true };
        return activeRequest.promise as Promise<T>;
      }
      const promise = fetchContentAndHydrate(next, context, identifier, { blocking: true });
      if (identifier) {
        void promise.finally(() => {
          DEDUPE.delete(identifier);
        });
        DEDUPE.set(identifier, { priority: { blocking: true }, promise });
      }
      return promise;
    }

    // if we have not skipped cache, determine if we should update behind the scenes
    if (calcShouldBackgroundFetch(store, context.request, false, identifier)) {
      const promise = activeRequest?.promise || fetchContentAndHydrate(next, context, identifier, { blocking: false });
      if (identifier && !activeRequest) {
        void promise.finally(() => {
          DEDUPE.delete(identifier);
        });
        DEDUPE.set(identifier, { priority: { blocking: false }, promise });
      }
      store.requestManager._pending.set(context.id, promise);
    }

    assert(`Expected a peeked request to be present`, peeked);

    const shouldHydrate: boolean = context.request[EnableHydration] || false;
    context.setResponse(peeked.response);

    if ('error' in peeked) {
      const content = shouldHydrate
        ? maybeUpdateErrorUiObjects<T>(
            store,
            { shouldHydrate, identifier },
            peeked.content as ResourceErrorDocument,
            true
          )
        : peeked.content;
      const newError = cloneError(peeked);
      newError.content = content as object;
      throw newError;
    }

    const result = shouldHydrate
      ? (maybeUpdateUiObjects<T>(
          store,
          context.request,
          { shouldHydrate, identifier },
          peeked.content as ResourceDataDocument,
          true
        ) as T)
      : (peeked.content as T);

    return result;
  },
};

type HydrationOptions = {
  shouldHydrate?: boolean;
  identifier: StableDocumentIdentifier | null;
};

type UpdateOptions = HydrationOptions & {
  priority: ManagedRequestPriority;
};

function maybeUpdateUiObjects<T>(
  store: Store,
  request: ImmutableRequestInfo,
  options: HydrationOptions,
  document: ResourceDataDocument | null,
  isFromCache: boolean
): Document<T> | ResourceDataDocument | null {
  const { identifier } = options;

  if (!document) {
    assert(`The CacheHandler expected response content but none was found`, !options.shouldHydrate);
    return document;
  }

  if (Array.isArray(document.data)) {
    const { recordArrayManager } = store;
    if (!identifier) {
      if (!options.shouldHydrate) {
        return document;
      }
      const data = recordArrayManager.createArray({
        type: request.url as string,
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
        query: request,
      }) as T;

      const doc = new Document<T>(store, null);
      doc.data = data;
      doc.meta = document.meta!;
      doc.links = document.links!;

      return doc;
    }
    let managed = recordArrayManager._keyedArrays.get(identifier.lid);

    if (!managed) {
      managed = recordArrayManager.createArray({
        type: identifier.lid,
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
      });
      recordArrayManager._keyedArrays.set(identifier.lid, managed);
      const doc = new Document<T>(store, identifier);
      doc.data = managed as T;
      doc.meta = document.meta!;
      doc.links = document.links!;
      store._documentCache.set(identifier, doc);

      return options.shouldHydrate ? doc : document;
    } else {
      const doc = store._documentCache.get(identifier) as Document<T>;
      if (!isFromCache) {
        recordArrayManager.populateManagedArray(managed, document.data, document as CollectionResourceDataDocument);
        doc.data = managed as T;
        doc.meta = document.meta!;
        doc.links = document.links!;
      }

      return options.shouldHydrate ? doc : document;
    }
  } else {
    if (!identifier && !options.shouldHydrate) {
      return document;
    }
    const data = (document.data ? store.peekRecord(document.data) : null) as T;
    let doc: Document<T> | undefined;
    if (identifier) {
      doc = store._documentCache.get(identifier) as Document<T> | undefined;
    }

    if (!doc) {
      doc = new Document<T>(store, identifier);
      doc.data = data;
      copyDocumentProperties(doc, document);

      if (identifier) {
        store._documentCache.set(identifier, doc);
      }
    } else if (!isFromCache) {
      doc.data = data;
      copyDocumentProperties(doc, document);
    }

    return options.shouldHydrate ? doc : document;
  }
}

function maybeUpdateErrorUiObjects<T>(
  store: Store,
  options: HydrationOptions,
  document: ResourceErrorDocument,
  isFromCache: boolean
): ResourceErrorDocument {
  const { identifier } = options;

  // TODO investigate why ResourceErrorDocument is insufficient for expressing all error types
  if (!isErrorDocument(document) || (!identifier && !options.shouldHydrate)) {
    return document;
  }

  let doc: Document<T> | undefined;
  if (identifier) {
    doc = store._documentCache.get(identifier) as Document<T> | undefined;
  }

  if (!doc) {
    doc = new Document<T>(store, identifier);
    copyDocumentProperties(doc, document);

    if (identifier) {
      store._documentCache.set(identifier, doc);
    }
  } else if (!isFromCache) {
    doc.data = undefined;
    copyDocumentProperties(doc, document);
  }

  return options.shouldHydrate ? (doc as ResourceErrorDocument) : document;
}

function updateCacheForSuccess<T>(
  store: Store,
  request: StoreRequestContext['request'],
  options: HydrationOptions,
  document: StructuredDataDocument<T>
) {
  let response: ResourceDataDocument | null = null;
  if (isMutation(request)) {
    const record = request.data?.record || request.records?.[0];
    if (record) {
      response = store.cache.didCommit(record, document) as ResourceDataDocument;

      // a mutation combined with a 204 has no cache impact when no known records were involved
      // a createRecord with a 201 with an empty response and no known records should similarly
      // have no cache impact
    } else if (isCacheAffecting(document)) {
      response = store.cache.put(document) as ResourceDataDocument;
    }
  } else {
    response = store.cache.put(document) as ResourceDataDocument;
  }
  return maybeUpdateUiObjects(store, request, options, response, false);
}

function handleFetchSuccess<T>(
  store: Store,
  context: StoreRequestContext,
  options: UpdateOptions,
  document: StructuredDataDocument<T>
): ResourceDataDocument | void {
  const { request } = context;
  store.requestManager._pending.delete(context.id);
  store._enableAsyncFlush = true;
  let response: ResourceDataDocument;
  store._join(() => {
    response = updateCacheForSuccess<T>(store, request, options, document) as ResourceDataDocument;
  });
  store._enableAsyncFlush = null;

  if (store.lifetimes?.didRequest) {
    store.lifetimes.didRequest(context.request, document.response, options.identifier, store);
  }

  const finalPriority = getPriority(options.identifier, store.requestManager._deduped, options.priority);
  if (finalPriority.blocking) {
    return response!;
  } else {
    store.notifications._flush();
  }
}

function updateCacheForError<T>(
  store: Store,
  context: StoreRequestContext,
  options: HydrationOptions,
  error: StructuredErrorDocument<T>
) {
  let response: ResourceErrorDocument | undefined;
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
  } else {
    response = store.cache.put(error) as ResourceErrorDocument;
    return maybeUpdateErrorUiObjects(store, options, response, false);
  }
}

function handleFetchError<T>(
  store: Store,
  context: StoreRequestContext,
  options: UpdateOptions,
  error: StructuredErrorDocument<T>
): ResourceErrorDocument | void {
  store.requestManager._pending.delete(context.id);
  if (context.request.signal?.aborted) {
    throw error;
  }
  store._enableAsyncFlush = true;
  let response: ResourceErrorDocument | undefined;
  store._join(() => {
    response = updateCacheForError(store, context, options, error);
  });
  store._enableAsyncFlush = null;

  if (options.identifier && store.lifetimes?.didRequest) {
    store.lifetimes.didRequest(context.request, error.response, options.identifier, store);
  }

  if (isMutation(context.request)) {
    throw error;
  }

  const finalPriority = getPriority(options.identifier, store.requestManager._deduped, options.priority);
  if (finalPriority.blocking) {
    const newError = cloneError(error);
    newError.content = response!;
    throw newError;
  } else {
    store.notifications._flush();
  }
}

function fetchContentAndHydrate<T>(
  next: NextFn<T>,
  context: StoreRequestContext,
  identifier: StableDocumentIdentifier | null,
  priority: { blocking: boolean }
): Promise<T> {
  const { store } = context.request;
  const shouldHydrate: boolean = context.request[EnableHydration] || false;
  const options = { shouldHydrate, identifier, priority };

  let isMut = false;
  if (isMutation(context.request)) {
    isMut = true;
    // TODO should we handle multiple records in request.records by iteratively calling willCommit for each
    const record = context.request.data?.record || context.request.records?.[0];
    assert(
      `Expected to receive a list of records included in the ${context.request.op} request`,
      record || !shouldHydrate
    );
    if (record) {
      store.cache.willCommit(record, context);
    }
  }

  if (store.lifetimes?.willRequest) {
    store.lifetimes.willRequest(context.request, identifier, store);
  }

  const promise = next(context.request).then(
    (document) => {
      return handleFetchSuccess(store, context, options, document);
    },
    (error: StructuredErrorDocument<T>) => {
      return handleFetchError(store, context, options, error);
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
