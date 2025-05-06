import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';
import type { ImmutableRequestInfo, ResponseInfo } from '@warp-drive/core-types/request';

import type { Store } from '../store-service';

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
 * @class <Interface> CachePolicy
 * @public
 */
export interface CachePolicy {
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
   * @return {Boolean} true if the request is considered hard expired
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
   * @return {Boolean} true if the request is considered soft expired
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
   * It is best practice to notify the store of any requests marked as invalidated
   * so that request subscriptions can reload when needed.
   *
   * ```ts
   * store.notifications.notify(identifier, 'invalidated');
   * ```
   *
   * This allows anything subscribed to the request to be notified of the change
   *
   * e.g.
   *
   * ```ts
   * store.notifications.subscribe(identifier, (_, type) => {
   *   if (type === 'invalidated') {
   *     // do update
   *   }
   * });
   * ```
   *
   * Note,
   *
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
