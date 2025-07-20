import type { Store, StoreRequestContext } from '@warp-drive/core';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';
import type { CacheHandler as CacheHandlerType, Future, NextFn } from '@warp-drive/core/request';
import type { RequestKey } from '@warp-drive/core/types/identifier';
import type {
  StructuredDataDocument,
  StructuredDocument,
  StructuredErrorDocument,
} from '@warp-drive/core/types/request';
import { SkipCache } from '@warp-drive/core/types/request';
import type {
  ResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
} from '@warp-drive/core/types/spec/document';
import type { ApiError } from '@warp-drive/core/types/spec/error';
import type { ExistingResourceObject } from '@warp-drive/core/types/spec/json-api-raw';

import { calcShouldFetch, cloneError, isCacheAffecting, isMutation } from './utils';
import type { DataWorker } from './worker';

/**
 * A simplified CacheHandler that hydrates ResourceDataDocuments from the cache
 * with their referenced resources.
 *
 */
export const CacheHandler: CacheHandlerType = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T | StructuredDataDocument<T>> | Future<T> | T {
    // if we have no cache or no cache-key skip cache handling
    if (!context.request.store || context.request.cacheOptions?.[SkipCache]) {
      return next(context.request);
    }

    const { store } = context.request;
    const identifier = store.cacheKeyManager.getOrCreateDocumentIdentifier(context.request);
    const peeked = identifier ? store.cache.peekRequest(identifier) : null;

    if (identifier && !peeked) {
      // if we are using persisted cache, we should attempt to populate the in-memory cache now
      const worker = (store as unknown as { _worker: DataWorker })._worker;
      if (worker?.storage) {
        return worker.storage
          .getDocument(identifier)
          .then((document) => {
            if (document) {
              store.cache.put(document);
            }
            return completeRequest(identifier, store, context, next);
          })
          .catch((e) => {
            if (DEBUG) {
              // eslint-disable-next-line no-console
              console.log('Unable to retrieve document from persisted storage', e);
            }
            return completeRequest(identifier, store, context, next);
          });
      }
    }

    return completeRequest(identifier, store, context, next);
  },
};

function completeRequest<T>(
  identifier: RequestKey | null,
  store: Store,
  context: StoreRequestContext,
  next: NextFn<T>
) {
  const peeked = identifier ? store.cache.peekRequest(identifier) : null;
  // In a Worker, any time we are asked to make a request, data needs to be returned.
  // background requests are ergo no different than foreground requests.
  if (calcShouldFetch(store, context.request, !!peeked, identifier)) {
    return fetchContentAndHydrate(next, context, identifier);
  }

  assert(`Expected a peeked request to be present`, peeked);
  context.setResponse(peeked.response);

  if ('error' in peeked) {
    throw peeked;
  }

  return maybeUpdateObjects<T>(store, peeked.content as ResourceDataDocument);
}

function maybeUpdateObjects<T>(store: Store, document: ResourceDataDocument | null): T {
  if (!document) {
    return document as T;
  }

  if (Array.isArray(document.data)) {
    const data = document.data.map((identifier) => {
      return store.cache.peek(identifier);
    });

    return Object.assign({}, document, { data }) as T;
  } else {
    // @ts-expect-error FIXME investigate why document.data won't accept the signature
    const data = (document.data ? store.cache.peek(document.data) : null) as T;
    return Object.assign({}, document, { data }) as T;
  }
}

function maybeUpdatePersistedCache(
  store: Store,
  document: StructuredDocument<ResourceDocument> | null,
  resourceDocument?: ResourceDataDocument
) {
  const worker = (store as unknown as { _worker: DataWorker })._worker;

  if (!worker?.storage) {
    return;
  }

  if (!document && resourceDocument) {
    // we have resources to update but not a full request to cache
    void worker.storage.putResources(resourceDocument, (resourceIdentifier) => {
      return store.cache.peek(resourceIdentifier) as ExistingResourceObject;
    });
  } else if (document) {
    void worker.storage.putDocument(document, (resourceIdentifier) => {
      return store.cache.peek(resourceIdentifier) as ExistingResourceObject;
    });
  }
}

function updateCacheForSuccess<T>(
  store: Store,
  request: StoreRequestContext['request'],
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
      maybeUpdatePersistedCache(store, null, response);
    }
  } else {
    response = store.cache.put(document) as ResourceDataDocument;

    if (response.lid) {
      const identifier = store.cacheKeyManager.getOrCreateDocumentIdentifier(request);
      const full = store.cache.peekRequest(identifier!);
      maybeUpdatePersistedCache(store, full);
    }
  }
  return maybeUpdateObjects(store, response);
}

function handleFetchSuccess<T>(
  store: Store,
  request: StoreRequestContext['request'],
  identifier: RequestKey | null,
  document: StructuredDataDocument<T>
): T {
  let response: ResourceDataDocument;
  store._join(() => {
    response = updateCacheForSuccess<T>(store, request, document) as ResourceDataDocument;
  });

  if (store.lifetimes?.didRequest) {
    store.lifetimes.didRequest(request, document.response, identifier, store);
  }

  return response! as T;
}

function updateCacheForError<T>(
  store: Store,
  request: StoreRequestContext['request'],
  error: StructuredErrorDocument<T>
) {
  if (isMutation(request)) {
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

    const record = request.data?.record || request.records?.[0];

    store.cache.commitWasRejected(record, errors);
  } else {
    const identifier = store.cacheKeyManager.getOrCreateDocumentIdentifier(request);
    if (identifier) {
      maybeUpdatePersistedCache(store, error as StructuredErrorDocument<ResourceErrorDocument>);
    }
    return store.cache.put(error) as ResourceErrorDocument;
  }
}

function handleFetchError<T>(
  store: Store,
  request: StoreRequestContext['request'],
  identifier: RequestKey | null,
  error: StructuredErrorDocument<T>
): never {
  if (request.signal?.aborted) {
    throw error;
  }
  let response: ResourceErrorDocument | undefined;
  store._join(() => {
    response = updateCacheForError(store, request, error);
  });

  if (identifier && store.lifetimes?.didRequest) {
    store.lifetimes.didRequest(request, error.response, identifier, store);
  }

  if (isMutation(request)) {
    throw error;
  }

  const newError = cloneError(error);
  newError.content = response!;
  throw newError;
}

function fetchContentAndHydrate<T>(
  next: NextFn<T>,
  context: StoreRequestContext,
  identifier: RequestKey | null
): Promise<T> {
  const { request } = context;
  const { store } = context.request;

  if (isMutation(request)) {
    // TODO should we handle multiple records in request.records by iteratively calling willCommit for each
    const record = request.data?.record || request.records?.[0];
    assert(`Expected to receive a list of records included in the ${request.op} request`, record);
    if (record) {
      store.cache.willCommit(record, context);
    }
  }

  if (store.lifetimes?.willRequest) {
    store.lifetimes.willRequest(request, identifier, store);
  }

  return next(request).then(
    (document) => handleFetchSuccess(store, request, identifier, document),
    (error: StructuredErrorDocument<T>) => handleFetchError(store, request, identifier, error)
  );
}
