import type {
  Future,
  Handler,
  ImmutableRequestInfo,
  NextFn,
  RequestContext,
  StructuredErrorDocument,
} from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import {
  CollectionResourceDataDocument,
  ResourceDataDocument,
  ResourceErrorDocument,
} from '@ember-data/types/cache/document';
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import { RecordInstance } from '@ember-data/types/q/record-instance';

import { Document } from './document';

export interface LifetimesService {
  isHardExpired(identifier: StableDocumentIdentifier): boolean;
  isSoftExpired(identifier: StableDocumentIdentifier): boolean;
}

export type StoreRequestInfo = ImmutableRequestInfo;
export type LooseStoreRequestInfo = Omit<StoreRequestInfo, 'records'> & { records: ResourceIdentifierObject[] };

export type StoreRequestInput = StoreRequestInfo | LooseStoreRequestInfo;

export interface StoreRequestContext extends RequestContext {
  request: StoreRequestInfo & { store: Store };
}

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
  identifier: StableDocumentIdentifier | null,
  shouldFetch: boolean,
  shouldBackgroundFetch: boolean
): Promise<T> {
  const { store } = context.request;
  const shouldHydrate: boolean =
    (context.request[Symbol.for('ember-data:enable-hydration')] as boolean | undefined) || false;
  return next(context.request).then(
    (document) => {
      store.requestManager._pending.delete(context.id);
      store._enableAsyncFlush = true;
      let response: ResourceDataDocument;
      store._join(() => {
        response = store.cache.put(document) as ResourceDataDocument;
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
      let response: ResourceErrorDocument;
      store._join(() => {
        response = store.cache.put(error) as ResourceErrorDocument;
        response = maybeUpdateUiObjects(
          store,
          context.request,
          { shouldHydrate, shouldFetch, shouldBackgroundFetch, identifier },
          response,
          false
        );
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

export const CacheHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T> | Future<T> {
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
      let promise = fetchContentAndHydrate(next, context, identifier, false, true);
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
