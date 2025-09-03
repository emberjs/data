import { LOG_REQUESTS } from '@warp-drive/build-config/debugging';
import { assert } from '@warp-drive/core/build-config/macros';

import { createReactiveDocument, type ReactiveDocument } from '../../../reactive/-private/document.ts';
import type { CacheHandler as CacheHandlerType, Future, ManagedRequestPriority, NextFn } from '../../../request.ts';
import type { RequestKey } from '../../../types/identifier.ts';
import type {
  ImmutableRequestInfo,
  RequestContext,
  StructuredDataDocument,
  StructuredErrorDocument,
} from '../../../types/request.ts';
import { EnableHydration, SkipCache } from '../../../types/request.ts';
import type { ResourceDataDocument, ResourceDocument, ResourceErrorDocument } from '../../../types/spec/document.ts';
import type { ApiError } from '../../../types/spec/error.ts';
import type { ResourceIdentifierObject } from '../../../types/spec/json-api-raw.ts';
import type { RequestSignature } from '../../../types/symbols.ts';
import { log } from '../debug/utils.ts';
import type { Store } from '../store-service.ts';
import {
  calcShouldBackgroundFetch,
  calcShouldFetch,
  cloneError,
  getPriority,
  isCacheAffecting,
  isMutation,
} from './utils.ts';

export type LooseStoreRequestInfo<RT = unknown> = Omit<
  ImmutableRequestInfo<RT>,
  'records' | 'headers' | typeof RequestSignature
> & {
  records?: ResourceIdentifierObject[];
  headers?: Headers;
};

export type StoreRequestInput<RT = unknown> = ImmutableRequestInfo<RT> | LooseStoreRequestInfo<RT>;

export interface StoreRequestContext extends RequestContext {
  request: ImmutableRequestInfo & { store: Store };
}

/**
 * A CacheHandler that adds support for using an WarpDrive Cache with a RequestManager.
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
 * approach of WarpDrive allows for this flexibility.
 *
 * ```ts
 * import { EnableHydration } from '@warp-drive/core/types/request';
 *
 * requestManager.request({
 *   store: store,
 *   url: '/api/posts',
 *   method: 'GET',
 *   [EnableHydration]: true
 * });
 *
 */
export const CacheHandler: CacheHandlerType = {
  request<T>(
    context: StoreRequestContext & { setIdentifier(identifier: RequestKey): void },
    next: NextFn<T>
  ): Promise<T | StructuredDataDocument<T>> | Future<T> | T {
    // if we have no cache or no cache-key skip cache handling
    if (!context.request.store || context.request.cacheOptions?.[SkipCache]) {
      return next(context.request);
    }

    const { store } = context.request;
    const identifier = store.cacheKeyManager.getOrCreateDocumentIdentifier(context.request);

    if (identifier) {
      context.setIdentifier(identifier);
    }

    // used to dedupe existing requests that match
    const DEDUPE = store.requestManager._deduped;
    const activeRequest = identifier && DEDUPE.get(identifier);
    const peeked = identifier ? store.cache.peekRequest(identifier) : null;

    // determine if we should skip cache
    if (calcShouldFetch(store, context.request, !!peeked, identifier)) {
      if (activeRequest) {
        activeRequest.priority = { blocking: true };
        if (LOG_REQUESTS) {
          log('request', '', 'DEDUPED', identifier.lid, 'blocking', '');
        }
        return activeRequest.promise as Promise<T>;
      }
      if (LOG_REQUESTS) {
        log(
          'request',
          '',
          'ISSUED',
          identifier?.lid ?? context.request.url ?? context.request.op ?? '<unknown request>',
          'blocking',
          ''
        );
      }
      let promise = fetchContentAndHydrate(next, context, identifier, { blocking: true });
      if (identifier) {
        promise = promise.finally(() => {
          DEDUPE.delete(identifier);
          store.notifications.notify(identifier, 'state', null);
        });
        DEDUPE.set(identifier, { priority: { blocking: true }, promise });
        queueMicrotask(() => {
          store.notifications.notify(identifier, 'state', null);
        });
      }
      store.requestManager._pending.set(context.id, promise);
      return promise;
    }

    // if we have not skipped cache, determine if we should update behind the scenes
    if (calcShouldBackgroundFetch(store, context.request, false, identifier)) {
      let promise = activeRequest?.promise || fetchContentAndHydrate(next, context, identifier, { blocking: false });
      if (identifier && !activeRequest) {
        promise = promise.finally(() => {
          DEDUPE.delete(identifier);
          store.notifications.notify(identifier, 'state', null);
        });
        DEDUPE.set(identifier, { priority: { blocking: false }, promise });
        queueMicrotask(() => {
          store.notifications.notify(identifier, 'state', null);
        });
      }
      if (LOG_REQUESTS) {
        if (activeRequest && identifier) {
          log(
            'request',
            '',
            'DEDUPED',
            identifier.lid,
            activeRequest.priority.blocking ? 'blocking' : 'non-blocking',
            ''
          );
        } else {
          log(
            'request',
            '',
            'ISSUED',
            identifier?.lid ?? context.request.url ?? context.request.op ?? '<unknown request>',
            'non-blocking',
            ''
          );
        }
      }
      store.requestManager._pending.set(context.id, promise);
    }

    if (LOG_REQUESTS) {
      log(
        'request',
        '',
        'CACHE-HIT',
        identifier?.lid ?? context.request.url ?? context.request.op ?? '<unknown request>',
        'cached',
        ''
      );
    }

    assert(`Expected a peeked request to be present`, peeked);

    const shouldHydrate: boolean = context.request[EnableHydration] || false;
    context.setResponse(peeked.response);

    if ('error' in peeked) {
      const content = shouldHydrate
        ? maybeUpdateUiObjects<T>(store, context.request, { shouldHydrate, identifier }, peeked.content)
        : peeked.content;
      const newError = cloneError(peeked);
      newError.content = content as object;
      throw newError;
    }

    const result = shouldHydrate
      ? (maybeUpdateUiObjects<T>(store, context.request, { shouldHydrate, identifier }, peeked.content) as T)
      : (peeked.content as T);

    return result;
  },
};

type HydrationOptions = {
  shouldHydrate?: boolean;
  identifier: RequestKey | null;
};

type UpdateOptions = HydrationOptions & {
  priority: ManagedRequestPriority;
};

function maybeUpdateUiObjects<T>(
  store: Store,
  request: ImmutableRequestInfo,
  options: HydrationOptions,
  document: ResourceDocument | null | undefined
): ReactiveDocument<T> | ResourceDocument | null {
  const { identifier } = options;

  if (!document || !options.shouldHydrate) {
    assert(`The CacheHandler expected response content but none was found`, !options.shouldHydrate);
    return document ?? null;
  }

  if (identifier) {
    return store._instanceCache.getDocument<T>(identifier);
  }

  // if we don't have an identifier, we give the document
  // its own local cache
  return createReactiveDocument<T>(store, null, {
    request,
    document,
  });
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
  return maybeUpdateUiObjects(store, request, options, response);
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
    return maybeUpdateUiObjects(store, context.request, options, response);
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
    response = updateCacheForError(store, context, options, error) as ResourceErrorDocument;
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
  identifier: RequestKey | null,
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
