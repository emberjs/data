import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { RequestManager, Store, StoreRequestInput } from '../index.ts';
import type { Future } from '../request.ts';
import type { RequestKey } from '../types/identifier.ts';
import type { StructuredErrorDocument } from '../types/request.ts';
import { defineSignal, memoized } from './reactivity/signal.ts';
import type { PrivateRequestState, RequestState } from './request-state.ts';
import { getRequestState } from './request-state.ts';

// default to 30 seconds unavailable before we refresh
const DEFAULT_DEADLINE = 30_000;
/**
 * A symbol used to dispose of a {@link RequestSubscription} when the
 * component or context using it is torn down.
 */
export const DISPOSE = (Symbol.dispose || Symbol.for('dispose')) as unknown as '(symbol) dispose';

function isNeverString(val: never): string {
  return val;
}

/**
 * The individual autorefresh strategies a {@link RequestSubscription}
 * may combine, see {@link AutorefreshBehaviorCombos}.
 *
 * @summary One autorefresh trigger for a request subscription: on reconnecting (`online`), on a timer
 * (`interval`), or on store invalidation (`invalid`).
 */
export type AutorefreshBehaviorType = 'online' | 'interval' | 'invalid';

/**
 * The value accepted by {@link SubscriptionArgs.autorefresh}: either a
 * boolean, a single {@link AutorefreshBehaviorType}, or a comma-separated
 * combination of up to three of them.
 *
 * @summary The accepted values for a request subscription's `autorefresh` option: a boolean or a
 * comma-separated mix of `online`, `interval`, and `invalid`.
 */
export type AutorefreshBehaviorCombos =
  | boolean
  | AutorefreshBehaviorType
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType}`
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType},${AutorefreshBehaviorType}`;

/**
 * Utilities to assist in recovering from the error.
 *
 * @summary The online and visibility state plus a `retry` function that a request subscription exposes
 * for recovering from a failed request.
 */
export interface RecoveryFeatures {
  /**
   * Whether the browser reports that the network is online.
   */
  isOnline: boolean;
  /**
   * Whether the browser reports that the tab is hidden.
   */
  isHidden: boolean;
  /**
   * Retries the request, reloading it from the server.
   * Resolves after the request settles, including failures. The {@link RequestSubscription.request | request Future}
   * still rejects on failure; inspect its {@link getRequestState | request state} for error details.
   *
   * @throws The returned promise rejects when reloading is unavailable because the network is offline or the tab is hidden.
   */
  retry: () => Promise<void>;
}

/** @deprecated use {@link RecoveryFeatures} */
export type ErrorFeatures = RecoveryFeatures;

/**
 * Utilities for keeping the request fresh
 *
 * @summary The online, visibility, and refreshing state plus `refresh`, `reload`, and `abort` functions a
 * request subscription exposes alongside successful content.
 */
export interface ContentFeatures<RT> {
  /**
   * Whether the browser reports that the network is online.
   */
  isOnline: boolean;
  /**
   * Whether the browser reports that the tab is hidden.
   */
  isHidden: boolean;
  /**
   * Whether the subscription is currently refreshing the request.
   */
  isRefreshing: boolean;
  /**
   * Refreshes the request, updating it in the background.
   * Resolves after the latest request settles, retaining current content if the refresh fails.
   * The latest request Future still rejects on failure; inspect its {@link RequestState} for error details.
   *
   * @throws The returned promise rejects when refreshing is unavailable because the network is offline or the tab is hidden.
   */
  refresh: () => Promise<void>;
  /**
   * Retries the request, reloading it from the server.
   * Resolves after the request settles, including failures. The {@link RequestSubscription.request | request Future}
   * still rejects on failure; inspect its {@link getRequestState | request state} for error details.
   *
   * @throws The returned promise rejects when reloading is unavailable because the network is offline or the tab is hidden.
   */
  reload: () => Promise<void>;
  /**
   * Aborts the in-flight refresh/reload request, if any.
   */
  abort?: () => void;
  /**
   * The most recent refresh/reload request that was made, if any.
   */
  latestRequest?: Future<RT>;
}

/**
 * The args accepted by the `<Request />` component.
 *
 * @summary The arguments of the `<Request />` component: the request or query to run, autorefresh
 * options, and an optional store or subscription.
 */
export interface RequestArgs<RT, E> extends SubscriptionArgs<RT, E> {
  /**
   * The {@link RequestSubscription} instance backing the component, if any.
   */
  subscription?: RequestSubscription<RT, E>;

  /**
   * The store instance to use for making requests. If contexts are available,
   * the component will default to using the `store` on the context.
   *
   * This is required if the store is not available via context or should be
   * different from the store provided via context.
   *
   */
  store?: Store | RequestManager;
}

/**
 * The args accepted by a {@link RequestSubscription}.
 *
 * @summary Options for a request subscription: the request or query to monitor and its autorefresh settings.
 */
// oxlint-disable-next-line no-unused-vars
export interface SubscriptionArgs<RT, E> {
  /**
   * The request to monitor. This should be a `Future` instance returned
   * by either the `store.request` or `store.requestManager.request` methods.
   *
   */
  request?: Future<RT> | undefined | null;

  /**
   * A query to use for the request. This should be an object that can be
   * passed to `store.request`. Use this in place of `@request` if you would
   * like the component to also initiate the request.
   *
   */
  query?: StoreRequestInput<RT> | undefined | null;

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

export interface RequestComponentArgs<RT, E> extends SubscriptionArgs<RT, E> {
  /**
   * The store instance to use for making requests. If contexts are available,
   * the component will default to using the `store` on the context.
   *
   * This is required if the store is not available via context or should be
   * different from the store provided via context.
   *
   */
  store?: Store | RequestManager;
}

// oxlint-disable-next-line no-unused-vars
export interface RequestSubscription<RT, E> {
  /**
   * The method to call when the component this subscription is attached to
   * unmounts.
   */
  [DISPOSE](): void;
}

/**
 * A reactive class
 *
 * @summary Reactive subscription that monitors a request or query, tracking online, visibility and refresh state and
 * handling autorefresh, reload and retry.
 * @hideconstructor
 */
export class RequestSubscription<RT, E> {
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
  declare private _originalRequest: Future<RT> | undefined | null;

  /**
   * The last query passed as an arg to the component,
   * cached for comparison.
   *
   * @internal
   */
  declare private _originalQuery: StoreRequestInput<RT> | undefined | null;
  /** @internal */
  declare private _subscription: object | null;
  /** @internal */
  declare private _subscribedTo: object | null;
  /** @internal */
  declare private _args: SubscriptionArgs<RT, E>;
  /**
   * The Store this subscription subscribes to or the RequestManager
   * which issues this request.
   */
  declare store: Store | RequestManager;
  /**
   * The Store or RequestManager that the last subscription is attached to.
   *
   * This differs from 'store' because a <Request /> may be passed a
   * request originating from a different store than the <Request />
   * component would use if it were to issue the request itself.
   *
   * @internal
   */
  private _requester: Store | RequestManager | null;

  constructor(store: Store | RequestManager, args: SubscriptionArgs<RT, E>) {
    this._args = args;
    this.store = store;
    this._subscribedTo = null;
    this._subscription = null;
    this._intervalStart = null;
    this._invalidated = false;
    this._nextInterval = null;
    this._requester = null;
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

  /**
   * Whether neither a `request` nor a `query` arg was provided, and so
   * this subscription has nothing to fetch or monitor.
   */
  @memoized
  get isIdle(): boolean {
    const { request, query } = this._args;

    return Boolean(!request && !query);
  }

  /**
   * The set of {@link AutorefreshBehaviorType}s this subscription is
   * configured to autorefresh for, derived from {@link SubscriptionArgs.autorefresh}.
   */
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
  /** @internal */
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
    }, autorefreshThreshold);
  }

  /** @internal */
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
    const store = this._getRequester();
    this._requester = store;
    if (requestId && isStore(store)) {
      this._subscribedTo = requestId;

      this._subscription = store.notifications.subscribe(
        requestId,
        (_id: RequestKey, op: 'invalidated' | 'state' | 'added' | 'updated' | 'removed') => {
          // ignore subscription events that occur while our own component's request
          // is occurring
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
    const store = this._requester;
    if (this._subscription && store && isStore(store)) {
      store.notifications.unsubscribe(this._subscription);
      this._subscribedTo = null;
      this._subscription = null;
      this._requester = null;
    }
  }

  /**
   * Install the event listeners for network and visibility changes.
   *
   * This is only done in environments that provide a fully-featured global
   * `window` and/or `document`. Some non-DOM environments (e.g. React Native,
   * SSR/Node, workers) may provide a `window` global without the APIs we
   * rely on here (or no `window`/`document` at all), in which case we skip
   * attaching the corresponding listeners rather than throwing.
   *
   * @internal
   */
  private _installListeners() {
    const hasWindow = typeof window !== 'undefined';
    const hasDocument = typeof document !== 'undefined';
    const hasWindowEvents = hasWindow && typeof window.addEventListener === 'function';
    const hasDocumentEvents = hasDocument && typeof document.addEventListener === 'function';

    this.isOnline = hasWindow && typeof window.navigator?.onLine === 'boolean' ? window.navigator.onLine : true;
    this._unavailableStart = this.isOnline ? null : Date.now();
    this.isHidden =
      hasDocument && typeof document.visibilityState === 'string' && document.visibilityState === 'hidden';

    if (hasWindowEvents) {
      this._onlineChanged = (event: Event) => {
        this.isOnline = event.type === 'online';
        if (event.type === 'offline' && this._unavailableStart === null) {
          this._unavailableStart = Date.now();
        }
        this._maybeUpdate();
      };

      window.addEventListener('online', this._onlineChanged, { passive: true, capture: true });
      window.addEventListener('offline', this._onlineChanged, { passive: true, capture: true });
    }

    if (hasDocumentEvents) {
      this._backgroundChanged = () => {
        const isHidden = document.visibilityState === 'hidden';
        this.isHidden = isHidden;

        if (isHidden && this._unavailableStart === null) {
          this._unavailableStart = Date.now();
        }

        this._maybeUpdate();
      };

      document.addEventListener('visibilitychange', this._backgroundChanged, { passive: true, capture: true });
    }
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

    const { reqState } = this;
    if (reqState.isPending) {
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
      this._isUpdating = true;

      const realMode = mode === '_invalidated' ? null : mode;
      const val = realMode ?? this._args.autorefreshBehavior ?? 'policy';

      // if the future was generated by an older store version, it may not have
      // a requester set. In this case we append it to ensure that reload and
      // refresh will work appropriately.
      const requester = this._getRequester();
      if (!(reqState as unknown as PrivateRequestState)._request.requester) {
        (reqState as unknown as PrivateRequestState)._request.requester = requester;
      }

      switch (val) {
        case 'reload':
          this._latestRequest = reqState.reload();
          break;
        case 'refresh':
          this._latestRequest = reqState.refresh();
          break;
        case 'policy':
          this._latestRequest = reqState.refresh(true);
          break;
        default:
          assert(`Invalid ${mode ? 'update mode' : '@autorefreshBehavior'} for <Request />: ${isNeverString(val)}`);
      }

      if (val !== 'refresh') {
        this._localRequest = this._latestRequest;
      }

      void this._scheduleInterval();
      const onSettled = () => {
        this._isUpdating = false;
      };
      void this._latestRequest.then(onSettled, onSettled);
    } else {
      // TODO probably want this
      // void this.scheduleInterval();
    }
  }

  /**
   * @internal
   */
  private _getRequester(): Store | RequestManager {
    // Note: we check for the requester's presence
    // as well as the request's presence because we may
    // be subscribed to a request issued by a store from an older
    // version of the library that didn't yet set requester.
    if (this._args.request?.requester) {
      return this._args.request.requester;
    }

    return this.store;
  }

  /**
   * Retry the request, reloading it from the server.
   * The {@link RequestSubscription.request | request Future} still rejects on failure;
   * inspect its {@link getRequestState | request state} for error details.
   *
   * @return Resolves after the request settles, including failures.
   * @throws The returned promise rejects when reloading is unavailable because the network is offline or the tab is hidden.
   */
  retry = async (): Promise<void> => {
    this._maybeUpdate('reload');
    await this._localRequest?.catch(() => undefined);
  };

  /**
   * Refresh the request, updating it in the background.
   * Retains current content if the refresh fails. The latest request Future still rejects on
   * failure; inspect its {@link getRequestState | request state} for error details.
   *
   * @return Resolves after the latest request settles, including failures.
   * @throws The returned promise rejects when refreshing is unavailable because the network is offline or the tab is hidden.
   */
  refresh = async (): Promise<void> => {
    this._maybeUpdate('refresh');
    await this._latestRequest?.catch(() => undefined);
  };

  /**
   * features to yield to the error slot of a component
   */
  @memoized
  get errorFeatures(): RecoveryFeatures {
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
    return (this.store as Store).request(query);
  }

  /**
   * The {@link Future} this subscription is currently monitoring, and
   * (re-)subscribes to notifications for as a side effect of access.
   */
  @memoized
  get request(): Future<RT> {
    if (DEBUG) {
      try {
        const request = this._request;
        this._updateSubscriptions();
        return request;
      } catch (e) {
        // oxlint-disable-next-line no-console
        console.log(e);
        throw new Error(`Unable to initialize the request`, { cause: e });
      }
    } else {
      const request = this._request;
      this._updateSubscriptions();
      return request;
    }
  }

  /**
   * The {@link RequestState} for {@link RequestSubscription.request | request}.
   */
  get reqState(): RequestState<RT, StructuredErrorDocument<E>> {
    return getRequestState<RT, E>(this.request);
  }

  /**
   * The resolved content of the request, once it has succeeded.
   */
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

/**
 * Creates a {@link RequestSubscription}, the reactive class powering the
 * `<Request />` component's autorefresh, retry, and refresh behaviors.
 *
 * @summary Creates a reactive subscription to a request or query that tracks its state and handles
 * autorefresh, retry, and refresh.
 */
export function createRequestSubscription<RT, E>(
  store: Store | RequestManager,
  args: SubscriptionArgs<RT, E>
): RequestSubscription<RT, E> {
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

function _DISPOSE<RT, E>(this: RequestSubscription<RT, E>) {
  const self = upgradeSubscription(this);
  self.isDestroyed = true;
  self._removeSubscriptions();
  self._clearInterval();

  if (self._onlineChanged && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('online', self._onlineChanged, { passive: true, capture: true } as unknown as boolean);
    window.removeEventListener('offline', self._onlineChanged, {
      passive: true,
      capture: true,
    } as unknown as boolean);
  }

  if (
    self._backgroundChanged &&
    typeof document !== 'undefined' &&
    typeof document.removeEventListener === 'function'
  ) {
    document.removeEventListener('visibilitychange', self._backgroundChanged, {
      passive: true,
      capture: true,
    } as unknown as boolean);
  }
}
