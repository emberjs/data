import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { RequestManager, Store, StoreRequestInput } from '../../../index';
import type { Future } from '../../../request';
import type { RequestKey } from '../../../types/identifier';
import type { RequestInfo, StructuredErrorDocument } from '../../../types/request';
import { EnableHydration } from '../../../types/request';
import type { RequestState } from '../../-private';
import { defineSignal, getRequestState, memoized } from '../../-private';

// default to 30 seconds unavailable before we refresh
const DEFAULT_DEADLINE = 30_000;
export const DISPOSE = (Symbol.dispose || Symbol.for('dispose')) as unknown as '(symbol) dispose';

function isNeverString(val: never): string {
  return val;
}

interface ErrorFeatures {
  isHidden: boolean;
  isOnline: boolean;
  retry: () => Promise<void>;
}

type AutorefreshBehaviorType = 'online' | 'interval' | 'invalid';
type AutorefreshBehaviorCombos =
  | boolean
  | AutorefreshBehaviorType
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType}`
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType},${AutorefreshBehaviorType}`;

type ContentFeatures<RT> = {
  isOnline: boolean;
  isHidden: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  abort?: () => void;
  latestRequest?: Future<RT>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface SubscriptionArgs<RT, T, E> {
  /**
   * The request to monitor. This should be a `Future` instance returned
   * by either the `store.request` or `store.requestManager.request` methods.
   *
   */
  request?: Future<RT>;

  /**
   * A query to use for the request. This should be an object that can be
   * passed to `store.request`. Use this in place of `@request` if you would
   * like the component to also initiate the request.
   *
   */
  query?: StoreRequestInput<RT, T>;

  /**
   * The autorefresh behavior for the request. This can be a boolean, or any
   * combination of the following values: `'online'`, `'interval'`, `'invalid'`.
   *
   * - `'online'`: Refresh the request when the browser comes back online
   * - `'interval'`: Refresh the request at a specified interval
   * - `'invalid'`: Refresh the request when the store emits an invalidation
   *
   * If `true`, this is equivalent to `'online,invalid'`.
   *
   * Defaults to `false`.
   *
   */
  autorefresh?: AutorefreshBehaviorCombos;

  /**
   * The number of milliseconds to wait before refreshing the request when the
   * browser comes back online or the network becomes available.
   *
   * This also controls the interval at which the request will be refreshed if
   * the `interval` autorefresh type is enabled.
   *
   * Defaults to `30_000` (30 seconds).
   *
   */
  autorefreshThreshold?: number;

  /**
   * The behavior of the request initiated by autorefresh. This can be one of
   * the following values:
   *
   * - `'refresh'`: Refresh the request in the background
   * - `'reload'`: Force a reload of the request
   * - `'policy'` (**default**): Let the store's configured CachePolicy decide whether to
   *    reload, refresh, or do nothing.
   *
   * Defaults to `'policy'`.
   *
   */
  autorefreshBehavior?: 'refresh' | 'reload' | 'policy';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface RequestSubscription<RT, T, E> {
  /**
   * The method to call when the component this subscription is attached to
   * unmounts.
   */
  [DISPOSE](): void;
}

/**
 * A reactive class
 *
 * @hideconstructor
 */
export class RequestSubscription<RT, T, E> {
  /**
   * Whether the browser reports that the network is online.
   */
  declare isOnline: boolean;

  /**
   * Whether the browser reports that the tab is hidden.
   */
  declare isHidden: boolean;

  /**
   * Whether the component is currently refreshing the request.
   */
  declare isRefreshing: boolean;

  /**
   * The most recent blocking request that was made, typically
   * the result of a reload.
   *
   * This will never be the original request passed as an arg to
   * the component.
   *
   * @internal
   */
  declare private _localRequest: Future<RT> | undefined;

  /**
   * The most recent request that was made, typically due to either a
   * reload or a refresh.
   *
   * This will never be the original request passed as an arg to
   * the component.
   *
   * @internal
   */
  declare private _latestRequest: Future<RT> | undefined;

  /**
   * The time at which the network was reported as offline.
   *
   * @internal
   */
  declare private _unavailableStart: number | null;
  /** @internal */
  declare private _intervalStart: number | null;
  /** @internal */
  declare private _nextInterval: number | null;
  /** @internal */
  declare private _invalidated: boolean;
  /** @internal */
  declare private _isUpdating: boolean;
  /** @internal */
  declare private isDestroyed: boolean;

  /**
   * The event listener for network status changes,
   * cached to use the reference for removal.
   *
   * @internal
   */
  declare private _onlineChanged: (event: Event) => void;

  /**
   * The event listener for visibility status changes,
   * cached to use the reference for removal.
   *
   * @internal
   */
  declare private _backgroundChanged: (event: Event) => void;

  /**
   * The last request passed as an arg to the component,
   * cached for comparison.
   *
   * @internal
   */
  declare private _originalRequest: Future<RT> | undefined;

  /**
   * The last query passed as an arg to the component,
   * cached for comparison.
   *
   * @internal
   */
  declare private _originalQuery: StoreRequestInput<RT, T> | undefined;
  /** @internal */
  declare private _subscription: object | null;
  /** @internal */
  declare private _subscribedTo: object | null;
  /** @internal */
  declare private _args: SubscriptionArgs<RT, T, E>;
  /** @internal */
  declare store: Store | RequestManager;

  constructor(store: Store | RequestManager, args: SubscriptionArgs<RT, T, E>) {
    this._args = args;
    this.store = store;
    this._subscribedTo = null;
    this._subscription = null;
    this._intervalStart = null;
    this._invalidated = false;
    this._nextInterval = null;
    this.isDestroyed = false;
    this[DISPOSE] = _DISPOSE;

    this._installListeners();
    void this._beginPolling();
  }

  /**
   * @internal
   */
  private async _beginPolling() {
    // await the initial request
    try {
      if (!this.isIdle) {
        await this.request;
      }
    } catch {
      // ignore errors here, we just want to wait for the request to finish
    } finally {
      if (!this.isDestroyed) {
        void this._scheduleInterval();
      }
    }
  }

  @memoized
  get isIdle(): boolean {
    const { request, query } = this._args;

    return Boolean(!request && !query);
  }

  @memoized
  get autorefreshTypes(): Set<AutorefreshBehaviorType> {
    const { autorefresh } = this._args;
    let types: AutorefreshBehaviorType[];

    if (autorefresh === true) {
      types = ['online', 'invalid'];
    } else if (typeof autorefresh === 'string') {
      types = autorefresh.split(',') as AutorefreshBehaviorType[];
    } else {
      types = [];
    }

    return new Set(types);
  }

  // we only run this function on component creation
  // and when an update is triggered, so it does not
  // react to changes in the autorefreshThreshold
  // or autorefresh args.
  //
  // if we need to react to those changes, we can
  // use a modifier or internal component or some
  // such to trigger a re-run of this function.
  private async _scheduleInterval() {
    const { autorefreshThreshold } = this._args;
    const hasValidThreshold = typeof autorefreshThreshold === 'number' && autorefreshThreshold > 0;
    if (
      // dont schedule in SSR
      typeof window === 'undefined' ||
      // dont schedule without a threshold
      !hasValidThreshold ||
      // dont schedule if we weren't told to
      !this.autorefreshTypes.has('interval') ||
      // dont schedule if we're already scheduled
      this._intervalStart !== null
    ) {
      return;
    }

    // if we have a current request, wait for it to finish
    // before scheduling the next one
    if (this._latestRequest) {
      try {
        await this._latestRequest;
      } catch {
        // ignore errors here, we just want to wait for the request to finish
      }

      if (this.isDestroyed) {
        return;
      }
    }

    // setup the next interval
    this._intervalStart = Date.now();
    this._nextInterval = setTimeout(() => {
      this._maybeUpdate();
    }, autorefreshThreshold) as unknown as number;
  }

  private _clearInterval() {
    if (this._nextInterval) {
      clearTimeout(this._nextInterval);
      this._intervalStart = null;
    }
  }
  /**
   * @internal
   */
  private _updateSubscriptions() {
    if (this.isIdle) {
      return;
    }
    const requestId = this._request.lid;

    // if we're already subscribed to this request, we don't need to do anything
    if (this._subscribedTo === requestId) {
      return;
    }

    // if we're subscribed to a different request, we need to unsubscribe
    this._removeSubscriptions();

    // if we have a request, we need to subscribe to it
    const { store } = this;
    if (requestId && isStore(store)) {
      this._subscribedTo = requestId;

      this._subscription = store.notifications.subscribe(
        requestId,
        (_id: RequestKey, op: 'invalidated' | 'state' | 'added' | 'updated' | 'removed') => {
          // ignore subscription events that occur while our own component's request
          // is ocurring
          if (this._isUpdating) {
            return;
          }
          switch (op) {
            case 'invalidated': {
              // if we're subscribed to invalidations, we need to update
              if (this.autorefreshTypes.has('invalid')) {
                this._invalidated = true;
                this._maybeUpdate();
              }
              break;
            }
            case 'state': {
              const latest = store.requestManager._deduped.get(requestId);
              const priority = latest?.priority;
              const state = this.reqState;
              if (!priority) {
                // if there is no priority, we have completed whatever request
                // was occurring and so we are no longer refreshing (if we were)
                this.isRefreshing = false;
              } else if (priority.blocking && !state.isLoading) {
                // if we are blocking, there is an active request for this identity
                // that MUST be fulfilled from network (not cache).
                // Thus this is not "refreshing" because we should clear out and
                // block on this request.
                //
                // we receive state notifications when either a request initiates
                // or completes.
                //
                // In the completes case: we may receive the state notification
                // slightly before the request is finalized because the NotificationManager
                // may sync flush it (and thus deliver it before the microtask completes)
                //
                // In the initiates case: we aren't supposed to receive one unless there
                // is no other request in flight for this identity.
                //
                // However, there is a race condition here where the completed
                // notification can trigger an update that generates a new request
                // thus giving us an initiated notification before the older request
                // finalizes.
                //
                // When this occurs, if the triggered update happens to have caused
                // a new request to be made for the same identity AND that request
                // is the one passed into this component as the @request arg, then
                // getRequestState will return the state of the new request.
                // We can detect this by checking if the request state is "loading"
                // as outside of this case we would have a completed request.
                //
                // That is the reason for the `&& !state.isLoading` check above.

                // TODO should we just treat this as refreshing?
                this.isRefreshing = false;
                this._maybeUpdate('policy', true);
              } else {
                this.isRefreshing = true;
              }
            }
          }
        }
      );
    }
  }

  /**
   * @internal
   */
  private _removeSubscriptions() {
    if (this._subscription && isStore(this.store)) {
      this.store.notifications.unsubscribe(this._subscription);
      this._subscribedTo = null;
      this._subscription = null;
    }
  }

  /**
   * Install the event listeners for network and visibility changes.
   * This is only done in browser environments with a global `window`.
   *
   * @internal
   */
  private _installListeners() {
    if (typeof window === 'undefined') {
      return;
    }

    this.isOnline = window.navigator.onLine;
    this._unavailableStart = this.isOnline ? null : Date.now();
    this.isHidden = document.visibilityState === 'hidden';

    this._onlineChanged = (event: Event) => {
      this.isOnline = event.type === 'online';
      if (event.type === 'offline' && this._unavailableStart === null) {
        this._unavailableStart = Date.now();
      }
      this._maybeUpdate();
    };
    this._backgroundChanged = () => {
      const isHidden = document.visibilityState === 'hidden';
      this.isHidden = isHidden;

      if (isHidden && this._unavailableStart === null) {
        this._unavailableStart = Date.now();
      }

      this._maybeUpdate();
    };

    window.addEventListener('online', this._onlineChanged, { passive: true, capture: true });
    window.addEventListener('offline', this._onlineChanged, { passive: true, capture: true });
    document.addEventListener('visibilitychange', this._backgroundChanged, { passive: true, capture: true });
  }

  /**
   * If the network is online and the tab is visible, either reload or refresh the request
   * based on the component's configuration and the requested update mode.
   *
   * Valid modes are:
   *
   * - `'reload'`: Force a reload of the request.
   * - `'refresh'`: Refresh the request in the background.
   * - `'policy'`: Make the request, letting the store's configured CachePolicy decide whether to reload, refresh, or do nothing.
   * - `undefined`: Make the request using the component's autorefreshBehavior setting if the autorefreshThreshold has passed.
   *
   * @internal
   */
  private _maybeUpdate(mode?: 'reload' | 'refresh' | 'policy' | '_invalidated', silent?: boolean): void {
    if (this.isIdle) {
      return;
    }
    const canAttempt = Boolean(this.isOnline && !this.isHidden && (mode || this.autorefreshTypes.size));

    if (!canAttempt) {
      if (!silent && mode && mode !== '_invalidated') {
        throw new Error(`Reload not available: the network is not online or the tab is hidden`);
      }

      return;
    }

    const { autorefreshTypes } = this;
    let shouldAttempt = this._invalidated || Boolean(mode);

    if (!shouldAttempt && autorefreshTypes.has('online')) {
      const { _unavailableStart } = this;
      const { autorefreshThreshold } = this._args;
      const deadline = typeof autorefreshThreshold === 'number' ? autorefreshThreshold : DEFAULT_DEADLINE;
      shouldAttempt = Boolean(_unavailableStart && Date.now() - _unavailableStart > deadline);
    }

    if (!shouldAttempt && autorefreshTypes.has('interval')) {
      const { _intervalStart } = this;
      const { autorefreshThreshold } = this._args;

      if (_intervalStart && typeof autorefreshThreshold === 'number' && autorefreshThreshold > 0) {
        shouldAttempt = Boolean(Date.now() - _intervalStart >= autorefreshThreshold);
      }
    }

    this._unavailableStart = null;
    this._invalidated = false;

    if (shouldAttempt) {
      this._clearInterval();
      const request = Object.assign({}, this.reqState.request as unknown as RequestInfo<RT, T>);
      const realMode = mode === '_invalidated' ? null : mode;
      const val = realMode ?? this._args.autorefreshBehavior ?? 'policy';
      switch (val) {
        case 'reload':
          request.cacheOptions = Object.assign({}, request.cacheOptions, { reload: true });
          break;
        case 'refresh':
          request.cacheOptions = Object.assign({}, request.cacheOptions, { backgroundReload: true });
          break;
        case 'policy':
          break;
        default:
          throw new Error(
            `Invalid ${mode ? 'update mode' : '@autorefreshBehavior'} for <Request />: ${isNeverString(val)}`
          );
      }

      const wasStoreRequest = request[EnableHydration] === true;
      assert(
        `Cannot supply a different store than was used to create the request`,
        !request.store || request.store === this.store
      );

      const store = (request.store as Store | undefined) || this.store;
      const requester = wasStoreRequest && 'requestManager' in store ? store.requestManager : store;

      this._isUpdating = true;
      this._latestRequest = requester.request(request);

      if (val !== 'refresh') {
        this._localRequest = this._latestRequest;
      }

      void this._scheduleInterval();
      void this._latestRequest.finally(() => {
        this._isUpdating = false;
      });
    } else {
      // TODO probably want this
      // void this.scheduleInterval();
    }
  }

  /**
   * Retry the request, reloading it from the server.
   */
  retry = async (): Promise<void> => {
    this._maybeUpdate('reload');
    await this._localRequest;
  };

  /**
   * Refresh the request, updating it in the background.
   */
  refresh = async (): Promise<void> => {
    this._maybeUpdate('refresh');
    await this._latestRequest;
  };

  /**
   * features to yield to the error slot of a component
   */
  @memoized
  get errorFeatures(): ErrorFeatures {
    return {
      isHidden: this.isHidden,
      isOnline: this.isOnline,
      retry: this.retry,
    };
  }

  /**
   * features to yield to the content slot of a component
   */
  @memoized
  get contentFeatures(): ContentFeatures<RT> {
    const feat: ContentFeatures<RT> = {
      isHidden: this.isHidden,
      isOnline: this.isOnline,
      reload: this.retry,
      refresh: this.refresh,
      isRefreshing: this.isRefreshing,
      latestRequest: this._latestRequest,
    };

    if (feat.isRefreshing) {
      feat.abort = () => {
        this._latestRequest?.abort();
      };
    }

    return feat;
  }

  /**
   * @internal
   */
  @memoized
  get _request(): Future<RT> {
    const { request, query } = this._args;
    assert(`Cannot use both @request and @query args with the <Request> component`, !request || !query);
    const { _localRequest, _originalRequest, _originalQuery } = this;
    const isOriginalRequest = request === _originalRequest && query === _originalQuery;

    if (_localRequest && isOriginalRequest) {
      return _localRequest;
    }

    // update state checks for the next time
    this._originalQuery = query;
    this._originalRequest = request;

    if (request) {
      return request;
    }
    assert(`You must provide either @request or an @query arg with the <Request> component`, query);
    // @ts-expect-error TODO investigate this
    return this.store.request(query);
  }

  @memoized
  get request(): Future<RT> {
    if (DEBUG) {
      try {
        const request = this._request;
        this._updateSubscriptions();
        return request;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        throw new Error(`Unable to initialize the request`, { cause: e });
      }
    } else {
      const request = this._request;
      this._updateSubscriptions();
      return request;
    }
  }

  get reqState(): RequestState<RT, T, StructuredErrorDocument<E>> {
    return getRequestState<RT, T, E>(this.request);
  }

  get result() {
    return this.reqState.result as RT;
  }
}

defineSignal(RequestSubscription.prototype, 'isOnline', true);
defineSignal(RequestSubscription.prototype, 'isHidden', false);
defineSignal(RequestSubscription.prototype, 'isRefreshing', false);
defineSignal(RequestSubscription.prototype, '_localRequest', undefined);
defineSignal(RequestSubscription.prototype, '_latestRequest', undefined);

function isStore(store: Store | RequestManager): store is Store {
  return 'requestManager' in store;
}

export function createRequestSubscription<RT, T, E>(
  store: Store | RequestManager,
  args: SubscriptionArgs<RT, T, E>
): RequestSubscription<RT, T, E> {
  return new RequestSubscription(store, args);
}

interface PrivateRequestSubscription {
  isDestroyed: boolean;
  _removeSubscriptions(): void;
  _clearInterval(): void;
  _onlineChanged: () => void;
  _backgroundChanged: () => void;
}

function upgradeSubscription(sub: unknown): PrivateRequestSubscription {
  return sub as PrivateRequestSubscription;
}

function _DISPOSE<RT, T, E>(this: RequestSubscription<RT, T, E>) {
  const self = upgradeSubscription(this);
  self.isDestroyed = true;
  self._removeSubscriptions();

  if (typeof window === 'undefined') {
    return;
  }

  self._clearInterval();

  window.removeEventListener('online', self._onlineChanged, { passive: true, capture: true } as unknown as boolean);
  window.removeEventListener('offline', self._onlineChanged, { passive: true, capture: true } as unknown as boolean);
  document.removeEventListener('visibilitychange', self._backgroundChanged, {
    passive: true,
    capture: true,
  } as unknown as boolean);
}
