import { DEBUG, TESTING } from '@warp-drive/core/build-config/env';

// oxlint-disable-next-line no-unused-vars
import type { Store } from '../../index';
// oxlint-disable-next-line no-unused-vars
import type { ReactiveDocument } from '../../reactive/-private/document';
import { installDevtoolsHook } from '../../devtools-hook.ts';
// oxlint-disable-next-line no-unused-vars
import { withReactiveResponse, withResponseType } from '../../request';
import { waitFor } from '../../signals/-private';
import { peekUniversalTransient, setUniversalTransient } from '../../types/-private';
import type { RequestKey } from '../../types/identifier';
/* oxlint-disable no-unused-vars */
import {
  EnableHydration,
  type RequestInfo,
  type StructuredDataDocument,
  type StructuredDocument,
  type StructuredErrorDocument,
} from '../../types/request';
/* oxlint-enable no-unused-vars */
import { assertValidRequest } from './debug';
import { upgradePromise } from './future';
import { clearRequestResult, getRequestResult, setPromiseResult } from './promise-cache';
import type { CacheHandler, Future, GenericCreateArgs, GodContext, Handler, ManagedRequestPriority } from './types';
import { executeNextHandler, IS_CACHE_HANDLER } from './utils';

/**
 * ## Import
 *
 * ```js
 * import { RequestManager } from '@warp-drive/core';
 * ```
 *
 * For a complete usage guide see [Making Requests](/guides/the-manual/requests/), and
 * [Handlers](/guides/the-manual/requests/handlers) for writing the handlers it runs.
 *
 * ## How It Works
 *
 * ```ts
 * interface RequestManager {
 *   request<T>(req: RequestInfo): Future<T>;
 * }
 * ```
 *
 * A RequestManager provides a request/response flow in which configured
 * handlers are successively given the opportunity to handle, modify, or
 * pass-along a request.
 *
 * <img src="/images/handlers-all-labeled.gif" alt="RequestManager Flow Animation" width="100%" />
 *
 * For example:
 *
 * ::: code-group
 *
 * ```ts [Setup.ts]
 * import { RequestManager, Fetch } from '@warp-drive/core';
 * import { AutoCompress } from '@warp-drive/utilities/handlers';
 * import { AuthHandler } from './auth-handler';
 *
 * // ... create manager
 * const manager = new RequestManager()
 *    .use([AuthHandler, new AutoCompress(), Fetch]); // [!code focus]
 * ```
 *
 * ```ts [auth-handler.ts]
 * import type { Handler, NextFn } from '@warp-drive/core/request';
 * import type { RequestContext } from '@warp-drive/core/types/request';
 *
 * const token = '<token>';
 *
 * // adds a bearer token to every request, then passes it along
 * export const AuthHandler: Handler = {
 *   request<T>(context: RequestContext, next: NextFn<T>) {
 *     const headers = new Headers(context.request.headers);
 *     headers.append('Authorization', `Bearer ${token}`);
 *
 *     return next(Object.assign({}, context.request, { headers }));
 *   },
 * };
 * ```
 *
 * ```ts [Usage.ts]
 * import Config from './config';
 *
 * const { apiUrl } = Config;
 *
 * // ... execute a request
 * const response = await manager.request({
 *   url: `${apiUrl}/users`
 * });
 * ```
 *
 * :::
 *
 * ### RequestManager vs {@link Store.request}
 *
 * A bare `RequestManager` is the low-level primitive: it runs a request through the configured
 * {@link Handler | handler chain} and settles with the raw {@link StructuredDocument}. It has no
 * cache and does not hydrate {@link ReactiveDocument | ReactiveDocuments} unless you register a
 * cache handler yourself via {@link RequestManager.useCache} and the request opts in.
 *
 * {@link Store.request} issues requests through this same `RequestManager`, but with the Store's
 * cache handler and hydration already wired up — inserting the response into the Store's cache
 * and resolving with a `ReactiveDocument` instead. Use `store.request` for anything the Store's
 * cache should own, which is nearly all app code. Reach for `requestManager.request` directly
 * only when there is no {@link Store} involved, or you specifically want the unprocessed
 * `StructuredDocument`.
 *
 * ### Futures
 *
 * The return value of `manager.request` is a `Future`, which allows
 * access to limited information about the request while it is still
 * pending and fulfills with the final state when the request completes.
 *
 * A `Future` is cancellable via `abort`.
 *
 * Handlers may optionally expose a `ReadableStream` to the `Future` for
 * streaming data; however, when doing so the future should not resolve
 * until the response stream is fully read.
 *
 * ```ts
 * interface Future<T> extends Promise<StructuredDocument<T>> {
 *   abort(): void;
 *
 *   async getStream(): ReadableStream | null;
 * }
 * ```
 *
 * ### StructuredDocuments
 *
 * A Future resolves with a `StructuredDataDocument` or rejects with a `StructuredErrorDocument`.
 *
 * ```ts
 * interface StructuredDataDocument<T> {
 *   request: ImmutableRequestInfo;
 *   response: ImmutableResponseInfo;
 *   content: T;
 * }
 * interface StructuredErrorDocument extends Error {
 *   request: ImmutableRequestInfo;
 *   response: ImmutableResponseInfo;
 *   error: string | object;
 * }
 * type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument;
 * ```
 *
 * @summary Runs each request through a chain of handlers that can fulfill, modify, or pass it along, and returns a `Future` for the response.
 * @public
 */
export class RequestManager {
  /** @internal */
  declare private _handlers: Handler[];
  /** @internal */
  declare private _hasCacheHandler: boolean;
  /**
   * A map of pending requests from request.id to their
   * associated CacheHandler promise.
   *
   * This queue is managed by the CacheHandler
   *
   * @internal
   */
  declare _pending: Map<number, Promise<unknown>>;
  /** @internal */
  declare _deduped: Map<RequestKey, { priority: ManagedRequestPriority; promise: Promise<unknown> }>;

  constructor(options?: GenericCreateArgs) {
    Object.assign(this, options);
    this._pending = new Map();
    this._deduped = new Map();
    this._handlers = [];
  }

  /**
   * Register a handler to use for primary cache intercept.
   *
   * Only one such handler may exist. If using the same
   * RequestManager as the Store instance the Store
   * registers itself as a Cache handler.
   *
   * @public
   */
  useCache(cacheHandler: CacheHandler & { [IS_CACHE_HANDLER]?: true }): this {
    if (DEBUG) {
      if (this._hasCacheHandler) {
        throw new Error(`\`RequestManager.useCache(<handler>)\` May only be invoked once.`);
      }
      if (Object.isFrozen(this._handlers)) {
        throw new Error(
          `\`RequestManager.useCache(<handler>)\` May only be invoked prior to any request having been made.`
        );
      }
      this._hasCacheHandler = true;
    }
    cacheHandler[IS_CACHE_HANDLER] = true;
    this._handlers.unshift(cacheHandler as Handler);
    return this;
  }

  /**
   * Register handler(s) to use when a request is issued.
   *
   * Handlers will be invoked in the order they are registered.
   * Each Handler is given the opportunity to handle the request,
   * curry the request, or pass along a modified request.
   *
   * @public
   */
  use(newHandlers: Handler[]): this {
    const handlers = this._handlers;
    if (DEBUG) {
      if (Object.isFrozen(handlers)) {
        throw new Error(`Cannot add a Handler to a RequestManager after a request has been made`);
      }
      if (!Array.isArray(newHandlers)) {
        throw new Error(
          `\`RequestManager.use(<Handler[]>)\` expects an array of handlers, but was called with \`${typeof newHandlers}\``
        );
      }
      newHandlers.forEach((handler, index) => {
        if (
          !handler ||
          (typeof handler !== 'function' && typeof handler !== 'object') ||
          typeof handler.request !== 'function'
        ) {
          throw new Error(
            `\`RequestManager.use(<Handler[]>)\` expected to receive an array of handler objects with request methods, by the handler at index ${index} does not conform.`
          );
        }
      });
    }
    handlers.push(...newHandlers);
    return this;
  }

  /**
   * Issue a Request.
   *
   * Runs `request` through the configured {@link Handler | handler chain} and settles with the
   * {@link StructuredDocument} the chain produces — a plain `{ request, response, content }`
   * object, not a {@link ReactiveDocument}. Caching and hydration only happen if a cache handler
   * has been registered via {@link RequestManager.useCache} and the request opts in; a
   * `RequestManager` created on its own has neither.
   *
   * Most app code should use {@link Store.request} instead, which calls this same method with
   * the Store's cache handler and hydration already configured. Reach for `requestManager.request`
   * directly when there is no {@link Store} involved, or when you want the unprocessed
   * `StructuredDocument`. The `<RT>` generic can be set explicitly or inferred from a request
   * built with {@link withResponseType} or {@link withReactiveResponse} — see
   * [Typing Requests](/guides/the-manual/requests/typing-requests.md).
   *
   * @example
   * ```ts
   * const { content } = await requestManager.request({ url: '/users' });
   * ```
   *
   * @public
   */
  request<RT>(request: RequestInfo<RT>): Future<RT> {
    const handlers = this._handlers;
    if (DEBUG) {
      if (!Object.isFrozen(handlers)) {
        Object.freeze(handlers);
      }
      assertValidRequest(request, true);
    }

    const controller = request.controller || new AbortController();
    if (request.controller) {
      delete request.controller;
    }

    const requestId = peekUniversalTransient<number>('REQ_ID') ?? 0;
    setUniversalTransient('REQ_ID', requestId + 1);

    const context = {
      controller,
      response: null,
      stream: null,
      hasRequestedStream: false,
      id: requestId,
      identifier: null,
      requester: request[EnableHydration] && request.store ? request.store : this,
    } satisfies GodContext;
    const promise = executeNextHandler<RT>(handlers, request, 0, context);

    // the cache handler will set the result of the request synchronously
    // if it is able to fulfill the request from the cache
    const cacheResult = getRequestResult(requestId);

    if (DEBUG) {
      traceRequest(request, context, promise, cacheResult !== undefined);
    }

    if (TESTING) {
      if (!request.disableTestWaiter) {
        const newPromise = waitFor(promise);
        const finalPromise = upgradePromise(
          newPromise.then(
            (result) => {
              setPromiseResult(finalPromise, { isError: false, result });
              clearRequestResult(requestId);
              return result;
            },
            (error: StructuredErrorDocument) => {
              setPromiseResult(finalPromise, { isError: true, result: error });
              clearRequestResult(requestId);
              throw error;
            }
          ),
          promise
        );

        if (cacheResult) {
          setPromiseResult(finalPromise, cacheResult);
        }

        return finalPromise;
      }
    }

    // const promise1 = store.request(myRequest);
    // const promise2 = store.request(myRequest);
    // promise1 === promise2; // false
    // either we need to make promise1 === promise2, or we need to make sure that
    // we need to have a way to key from request to result
    // such that we can lookup the result here and return it if it exists
    const finalPromise = upgradePromise(
      promise.then(
        (result) => {
          setPromiseResult(finalPromise, { isError: false, result });
          clearRequestResult(requestId);
          return result;
        },
        (error: StructuredErrorDocument) => {
          setPromiseResult(finalPromise, { isError: true, result: error });
          clearRequestResult(requestId);
          throw error;
        }
      ),
      promise
    );

    if (cacheResult) {
      setPromiseResult(finalPromise, cacheResult);
    }

    return finalPromise;
  }

  /**
   * This method exists so that the RequestManager can be created
   * can be created by container/factory systems that expect to
   * call a static `create` method to instantiate the class.
   *
   * Using `new RequestManager()` directly is preferred.
   *
   * @private
   */
  static create(options?: GenericCreateArgs): RequestManager {
    return new this(options);
  }
}

/**
 * Reports a request's lifecycle to the DevTools hook: one `pending` event
 * now and one terminal event when it settles. Only called in DEBUG builds.
 */
function traceRequest(request: RequestInfo, context: GodContext, promise: Promise<unknown>, fromCache: boolean): void {
  const hook = installDevtoolsHook();
  const startedAt = Date.now();
  const storeId = hook.storeIdFor(context.requester);
  const op = typeof request.op === 'string' ? request.op : null;

  hook.recordRequest({
    id: context.id,
    storeId,
    url: request.url ?? null,
    method: request.method ?? null,
    op,
    status: 'pending',
    startedAt,
    endedAt: null,
    durationMs: null,
    fromCache,
    responseStatus: null,
    cacheKey: null,
    error: null,
  });

  promise.then(
    (result) => {
      const endedAt = Date.now();
      const doc = result as StructuredDataDocument<unknown>;
      hook.recordRequest({
        id: context.id,
        storeId,
        url: doc.request?.url ?? request.url ?? null,
        method: doc.request?.method ?? request.method ?? null,
        op,
        status: 'success',
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        fromCache,
        responseStatus: doc.response?.status ?? null,
        cacheKey: context.identifier?.lid ?? null,
        error: null,
      });
    },
    (error: StructuredErrorDocument) => {
      const endedAt = Date.now();
      hook.recordRequest({
        id: context.id,
        storeId,
        url: error.request?.url ?? request.url ?? null,
        method: error.request?.method ?? request.method ?? null,
        op,
        status: error.name === 'AbortError' ? 'cancelled' : 'error',
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        fromCache,
        responseStatus: error.response?.status ?? null,
        cacheKey: context.identifier?.lid ?? null,
        error: typeof error.message === 'string' ? error.message : String(error),
      });
    }
  );
}

/**
 * This type exists for internal use only for
 * where intimate contracts still exist either for
 * the Test Suite or for Legacy code.
 *
 * @private
 */
export interface PrivateRequestManager extends RequestManager {
  /**
   * A map of pending requests from request.id to their
   * associated CacheHandler promise.
   *
   * This queue is managed by the CacheHandler
   *
   */
  _pending: Map<number, Promise<unknown>>;
  _deduped: Map<RequestKey, { priority: ManagedRequestPriority; promise: Promise<unknown> }>;
}
