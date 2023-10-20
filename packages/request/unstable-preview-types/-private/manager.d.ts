import { Future, GenericCreateArgs, Handler, RequestInfo } from './types';
/**
 * ```js
 * import RequestManager from '@ember-data/request';
 * ```
 *
 * A RequestManager provides a request/response flow in which configured
 * handlers are successively given the opportunity to handle, modify, or
 * pass-along a request.
 *
 * ```ts
 * interface RequestManager {
 *   request<T>(req: RequestInfo): Future<T>;
 * }
 * ```
 *
 * For example:
 *
 * ```ts
 * import RequestManager from '@ember-data/request';
 * import Fetch from '@ember-data/request/fetch';
 * import Auth from 'ember-simple-auth/ember-data-handler';
 * import Config from './config';
 *
 * const { apiUrl } = Config;
 *
 * // ... create manager
 * const manager = new RequestManager();
 * manager.use([Auth, Fetch]);
 *
 * // ... execute a request
 * const response = await manager.request({
 *   url: `${apiUrl}/users`
 * });
 * ```
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
 * @class RequestManager
 * @public
 */
export declare class RequestManager {
    #private;
    _hasCacheHandler: boolean;
    _pending: Map<number, Promise<unknown>>;
    constructor(options?: GenericCreateArgs);
    /**
     * Register a handler to use for primary cache intercept.
     *
     * Only one such handler may exist. If using the same
     * RequestManager as the Store instance the Store
     * registers itself as a Cache handler.
     *
     * @method useCache
     * @public
     * @param {Handler[]} cacheHandler
     * @returns {void}
     */
    useCache(cacheHandler: Handler): void;
    /**
     * Register handler(s) to use when a request is issued.
     *
     * Handlers will be invoked in the order they are registered.
     * Each Handler is given the opportunity to handle the request,
     * curry the request, or pass along a modified request.
     *
     * @method use
     * @public
     * @param {Handler[]} newHandlers
     * @returns {void}
     */
    use(newHandlers: Handler[]): void;
    /**
     * Issue a Request.
     *
     * Returns a Future that fulfills with a StructuredDocument
     *
     * @method request
     * @public
     * @param {RequestInfo} request
     * @returns {Future}
     */
    request<T = unknown>(request: RequestInfo): Future<T>;
    static create(options?: GenericCreateArgs): RequestManager;
}
//# sourceMappingURL=manager.d.ts.map