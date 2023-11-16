import { assert } from '@ember/debug';

import type { Future, Handler, NextFn } from '@ember-data/request/-private/types';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';
import type {
  CreateRequestOptions,
  DeleteRequestOptions,
  ImmutableRequestInfo,
  RequestContext,
  StructuredDataDocument,
  StructuredErrorDocument,
  UpdateRequestOptions,
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

export interface LifetimesService {
  isHardExpired(identifier: StableDocumentIdentifier): boolean;
  isSoftExpired(identifier: StableDocumentIdentifier): boolean;
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

function isMutation(
  request: Partial<StoreRequestInfo>
): request is UpdateRequestOptions | CreateRequestOptions | DeleteRequestOptions {
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
    const record = context.request.data?.record;
    assert(`Expected to receive a list of records included in the ${context.request.op} request`, record);
    store.cache.willCommit(record, context);
  }

  const promise = next(context.request).then(
    (document) => {
      store.requestManager._pending.delete(context.id);
      store._enableAsyncFlush = true;
      let response: ResourceDataDocument;
      store._join(() => {
        if (isMutation(context.request)) {
          response = store.cache.didCommit(context.request.data.record, document) as ResourceDataDocument;
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
          store.cache.commitWasRejected(context.request.data.record, errors);
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
  return store._requestCache._enqueue(promise, {
    data: [{ op: 'saveRecord', recordIdentifier: context.request.data.record, options: undefined }],
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
