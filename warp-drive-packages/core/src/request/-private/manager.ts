import { DEBUG, TESTING } from '@warp-drive/core/build-config/env';

import { waitFor } from '../../store/-private/new-core-tmp/reactivity/configure';
import { peekUniversalTransient, setUniversalTransient } from '../../types/-private';
import type { RequestKey } from '../../types/identifier';
import { EnableHydration, type RequestInfo, type StructuredErrorDocument } from '../../types/request';
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
 * For complete usage guide see the [RequestManager Documentation](/guides/).
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
 * import Auth from 'ember-simple-auth/handler';
 *
 * // ... create manager
 * const manager = new RequestManager()
 *    .use([Auth, new AutoCompress(), Fetch]); // [!code focus]
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
 * @hideconstructor
 * @public
 */
export class RequestManager {
  /** @internal */
  #handlers: Handler[] = [];
  /** @internal */
  declare _hasCacheHandler: boolean;
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
      if (Object.isFrozen(this.#handlers)) {
        throw new Error(
          `\`RequestManager.useCache(<handler>)\` May only be invoked prior to any request having been made.`
        );
      }
      this._hasCacheHandler = true;
    }
    cacheHandler[IS_CACHE_HANDLER] = true;
    this.#handlers.unshift(cacheHandler as Handler);
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
    const handlers = this.#handlers;
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
   * Returns a Future that fulfills with a StructuredDocument
   *
   * @public
   */
  request<RT>(request: RequestInfo<RT>): Future<RT> {
    const handlers = this.#handlers;
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
