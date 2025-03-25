/**
 * @module @warp-drive/ember
 */
import type Owner from '@ember/owner';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';

import { importSync, macroCondition, moduleExists } from '@embroider/macros';

import type { Future, StructuredErrorDocument } from '@ember-data/request';
import type { StoreRequestInput } from '@ember-data/store';
import type Store from '@ember-data/store';
import { assert } from '@warp-drive/build-config/macros';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier.js';
import { EnableHydration, type RequestInfo } from '@warp-drive/core-types/request';

import { and, Throw } from './await.gts';
import type { RequestLoadingState, RequestState } from './request-state.ts';
import { getRequestState } from './request-state.ts';

function notNull(x: null): never;
function notNull<T>(x: T): Exclude<T, null>;
function notNull<T>(x: T | null) {
  assert('Expected a non-null value, but got null', x !== null);
  return x;
}

const not = (x: unknown) => !x;
// default to 30 seconds unavailable before we refresh
const DEFAULT_DEADLINE = 30_000;
const IdleBlockMissingError = new Error(
  'No idle block provided for <Request> component, and no query or request was provided.'
);

let consume = service;
if (macroCondition(moduleExists('ember-provide-consume-context'))) {
  const { consume: contextConsume } = importSync('ember-provide-consume-context') as { consume: typeof service };
  consume = contextConsume;
}

function isNeverString(val: never): string {
  return val;
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

interface RequestSignature<T, RT> {
  Args: {
    /**
     * The request to monitor. This should be a `Future` instance returned
     * by either the `store.request` or `store.requestManager.request` methods.
     *
     * @typedoc
     */
    request?: Future<RT>;

    /**
     * A query to use for the request. This should be an object that can be
     * passed to `store.request`. Use this in place of `@request` if you would
     * like the component to also initiate the request.
     *
     * @typedoc
     */
    query?: StoreRequestInput<T, RT>;

    /**
     * The store instance to use for making requests. If contexts are available,
     * the component will default to using the `store` on the context.
     *
     * This is required if the store is not available via context or should be
     * different from the store provided via context.
     *
     * @typedoc
     */
    store?: Store;

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
     * @typedoc
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
     * @typedoc
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
     * @typedoc
     */
    autorefreshBehavior?: 'refresh' | 'reload' | 'policy';
  };
  Blocks: {
    /**
     * The block to render when the component is idle and waiting to be given a request.
     *
     * @typedoc
     */
    idle: [];

    /**
     * The block to render when the request is loading.
     *
     * @typedoc
     */
    loading: [state: RequestLoadingState];

    /**
     * The block to render when the request was cancelled.
     *
     * @typedoc
     */
    cancelled: [
      error: StructuredErrorDocument,
      features: { isOnline: boolean; isHidden: boolean; retry: () => Promise<void> },
    ];

    /**
     * The block to render when the request failed. If this block is not provided,
     * the error will be rethrown.
     *
     * Thus it is required to provide an error block and proper error handling if
     * you do not want the error to crash the application.
     *
     * @typedoc
     */
    error: [
      error: StructuredErrorDocument,
      features: { isOnline: boolean; isHidden: boolean; retry: () => Promise<void> },
    ];

    /**
     * The block to render when the request succeeded.
     *
     * @typedoc
     */
    content: [value: RT, features: ContentFeatures<RT>];
    always: [state: RequestState<T, RT>];
  };
}

/**
 * The `<Request />` component is a powerful tool for managing data fetching and
 * state in your Ember application. It provides a declarative approach to reactive
 * control-flow for managing requests and state in your application.
 *
 * The `<Request />` component is ideal for handling "boundaries", outside which some
 * state is still allowed to be unresolved and within which it MUST be resolved.
 *
 * ## Request States
 *
 * `<Request />` has five states, only one of which will be active and rendered at a time.
 *
 * - `idle`: The component is waiting to be given a request to monitor
 * - `loading`: The request is in progress
 * - `error`: The request failed
 * - `content`: The request succeeded
 * - `cancelled`: The request was cancelled
 *
 * Additionally, the `content` state has a `refresh` method that can be used to
 * refresh the request in the background, which is available as a sub-state of
 * the `content` state.
 *
 * As with the `<Await />` component, if no error block is provided and the request
 * rejects, the error will be thrown. Cancellation errors are swallowed instead of
 * rethrown if no error block or cancellation block is present.
 *
 * ```gts
 * import { Request } from '@warp-drive/ember';
 *
 * <template>
 *   <Request @request={{@request}}>
 *     <:loading as |state|>
 *       <Spinner @percentDone={{state.completedRatio}} />
 *       <button {{on "click" state.abort}}>Cancel</button>
 *     </:loading>
 *
 *     <:error as |error state|>
 *       <ErrorForm @error={{error}} />
 *       <button {{on "click" state.retry}}>Retry</button>
 *     </:error>
 *
 *     <:content as |data state|>
 *       <h1>{{data.title}}</h1>
 *       {{#if state.isBackgroundReloading}}
 *         <SmallSpinner />
 *         <button {{on "click" state.abort}}>Cancel</button>
 *       {{else}}
 *         <button {{on "click" state.refresh}}>Refresh</button>
 *       {{/if}}
 *     </:content>
 *
 *     <:cancelled as |error state|>
 *       <h2>The Request was cancelled</h2>
 *       <button {{on "click" state.retry}}>Retry</button>
 *     </:cancelled>
 *
 *     <:idle>
 *       <button {{on "click" @kickOffRequest}}>Load Preview?</button>
 *     </:idle>
 *
 *   </Request>
 * </template>
 * ```
 *
 * ## Streaming Data
 *
 * The loading state exposes the download `ReadableStream` instance for consumption
 *
 * ```gjs
 * import { Request } from '@warp-drive/ember';
 *
 * <template>
 *   <Request @request={{@request}}>
 *     <:loading as |state|>
 *       <Video @stream={{state.stream}} />
 *     </:loading>
 *
 *     <:error as |error|>
 *       <ErrorForm @error={{error}} />
 *     </:error>
 *   </Request>
 * </template>
 * ```
 *
 * ## Retry
 *
 * Cancelled and error'd requests may be retried by calling the `retry` method.
 *
 * Retry will restart the state progression, using the loading, error, cancelled,
 * and content blocks as appropriate.
 *
 * ## Reloading
 *
 * The `reload` method will force the request to be fully re-executed, bypassing
 * cache and restarting the state progression through the loading, error, and
 * content blocks as appropriate.
 *
 * Background reload (refresh) is a special substate of the content state that
 * allows you to refresh the request in the background. This is useful for when
 * you want to update the data in the background without blocking the UI.
 *
 * Reload and refresh are available as methods on the `content` state.
 *
 * ```gjs
 * import { Request } from '@warp-drive/ember';
 *
 * <template>
 *   <Request @request={{@request}}>
 *     <:content as |data state|>
 *       <h1>{{data.title}}</h1>
 *       {{#if state.isBackgroundReloading}}
 *         <SmallSpinner />
 *         <button {{on "click" state.abort}}>Cancel</button>
 *       {{/if}}
 *
 *       <button {{on "click" state.refresh}}>Refresh</button>
 *       <button {{on "click" state.reload}}>Reload</button>
 *     </:content>
 *  </Request>
 * </template>
 * ```
 *
 * ## Advanced Reloading
 *
 * We can nest our usage of `<Request />` to handle more advanced
 * reloading scenarios.
 *
 * ```gjs
 * import { Request } from '@warp-drive/ember';
 *
 * <template>
 *   <Request @request={{@request}}>
 *     <:cancelled>
 *       <h2>The Request Cancelled</h2>
 *     </:cancelled>
 *
 *     <:error as |error|>
 *       <ErrorForm @error={{error}} />
 *     </:error>
 *
 *     <:content as |result state|>
 *       <Request @request={{state.latestRequest}}>
 *         <!-- Handle Background Request -->
 *       </Request>
 *
 *       <h1>{{result.title}}</h1>
 *
 *       <button {{on "click" state.refresh}}>Refresh</button>
 *     </:content>
 *   </Request>
 * </template>
 * ```
 *
 * ## Autorefresh
 *
 * `<Request />` supports automatic refresh and reload under certain conditions.
 *
 * - `online`: This occurs when a browser window or tab comes back to the foreground
 *   after being backgrounded or when the network reports as being online after
 *   having been offline.
 * - `interval`: This occurs when a specified amount of time has passed.
 * - `invalid`: This occurs when the store emits a notification that the request
 *   has become invalid.
 *
 * You can specify when autorefresh should occur by setting the `autorefresh` arg
 * to `true` or a comma-separated list of the above values.
 *
 * A value of `true` is equivalent to `'online,invalid'`.
 *
 * By default, an autorefresh will only occur if the browser was backgrounded or
 * offline for more than 30s before coming back available. This amount of time can
 * be tweaked by setting the number of milliseconds via `@autorefreshThreshold`.
 *
 * This arg also controls the interval at which the request will be refreshed
 * if the `interval` autorefresh type is enabled.
 *
 * Finally, the behavior of the request initiated by autorefresh can be adjusted
 * by setting the `autorefreshBehavior` arg to `'refresh'`, `'reload'`, or `'policy'`.
 *
 * - `'refresh'`: Refresh the request in the background
 * - `'reload'`: Force a reload of the request
 * - `'policy'` (**default**): Let the store's configured CachePolicy decide whether to
 *    reload, refresh, or do nothing.
 *
 * More advanced refresh and reload behaviors can be created by passing the reload and
 * refresh actions into another component. For instance, refresh could be set up on a
 * timer or on a websocket subscription.
 *
 *
 * ```gjs
 * import { Request } from '@warp-drive/ember';
 *
 * <template>
 *   <Request @request={{@request}}>
 *     <:content as |result state|>
 *       <h1>{{result.title}}</h1>
 *
 *       <Interval @period={{30_000}} @fn={{state.refresh}} />
 *       <Subscribe @channel={{@someValue}} @fn={{state.refresh}} />
 *     </:content>
 *   </Request>
 * </template>
 * ```
 *
 * If a matching request is refreshed or reloaded by any other component,
 * the `Request` component will react accordingly.
 *
 * ## Deduping
 *
 * The store dedupes requests by identity. If a request is made for the same identity
 * from multiple `<Request />` components, even if the request is not referentially the
 * same, only one actual request will be made.
 *
 *
 * @class <Request />
 * @public
 */
export class Request<T, RT> extends Component<RequestSignature<T, RT>> {
  /**
   * The store instance to use for making requests. If contexts are available, this
   * will be the `store` on the context, else it will be the store service.
   *
   * @internal
   */
  @consume('store') declare _store: Store;

  /**
   * Whether the browser reports that the network is online.
   *
   * @internal
   */
  @tracked isOnline = true;

  /**
   * Whether the browser reports that the tab is hidden.
   *
   * @internal
   */
  @tracked isHidden = true;

  /**
   * Whether the component is currently refreshing the request.
   *
   * @internal
   */
  @tracked isRefreshing = false;

  /**
   * The most recent blocking request that was made, typically
   * the result of a reload.
   *
   * This will never be the original request passed as an arg to
   * the component.
   *
   * @internal
   */
  @tracked _localRequest: Future<RT> | undefined;

  /**
   * The most recent request that was made, typically due to either a
   * reload or a refresh.
   *
   * This will never be the original request passed as an arg to
   * the component.
   *
   * @internal
   */
  @tracked _latestRequest: Future<RT> | undefined;

  /**
   * The time at which the network was reported as offline.
   *
   * @internal
   */
  declare unavailableStart: number | null;
  declare intervalStart: number | null;
  declare nextInterval: number | null;
  declare invalidated: boolean;
  declare isUpdating: boolean;

  /**
   * The event listener for network status changes,
   * cached to use the reference for removal.
   *
   * @internal
   */
  declare onlineChanged: (event: Event) => void;

  /**
   * The event listener for visibility status changes,
   * cached to use the reference for removal.
   *
   * @internal
   */
  declare backgroundChanged: (event: Event) => void;

  /**
   * The last request passed as an arg to the component,
   * cached for comparison.
   *
   * @internal
   */
  declare _originalRequest: Future<RT> | undefined;

  /**
   * The last query passed as an arg to the component,
   * cached for comparison.
   *
   * @internal
   */
  declare _originalQuery: StoreRequestInput<T, RT> | undefined;

  declare _subscription: object | null;
  declare _subscribedTo: object | null;

  constructor(owner: Owner, args: RequestSignature<T, RT>['Args']) {
    super(owner, args);
    this._subscribedTo = null;
    this._subscription = null;
    this.intervalStart = null;
    this.invalidated = false;
    this.nextInterval = null;

    this.installListeners();
    void this.beginPolling();
  }

  async beginPolling() {
    // await the initial request
    try {
      await this.request;
    } catch {
      // ignore errors here, we just want to wait for the request to finish
    } finally {
      if (!this.isDestroyed) {
        void this.scheduleInterval();
      }
    }
  }

  @cached
  get isIdle() {
    const { request, query } = this.args;

    return Boolean(!request && !query);
  }

  @cached
  get autorefreshTypes(): Set<AutorefreshBehaviorType> {
    const { autorefresh } = this.args;
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
  async scheduleInterval() {
    const { autorefreshThreshold } = this.args;
    const hasValidThreshold = typeof autorefreshThreshold === 'number' && autorefreshThreshold > 0;
    if (
      // dont schedule in SSR
      typeof window === 'undefined' ||
      // dont schedule without a threshold
      !hasValidThreshold ||
      // dont schedule if we weren't told to
      !this.autorefreshTypes.has('interval') ||
      // dont schedule if we're already scheduled
      this.intervalStart !== null
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
    this.intervalStart = Date.now();
    this.nextInterval = setTimeout(() => {
      this.maybeUpdate();
    }, autorefreshThreshold) as unknown as number;
  }

  clearInterval() {
    if (this.nextInterval) {
      clearTimeout(this.nextInterval);
      this.intervalStart = null;
    }
  }

  updateSubscriptions() {
    if (this.isIdle) {
      return;
    }
    const requestId = this._request.lid;

    // if we're already subscribed to this request, we don't need to do anything
    if (this._subscribedTo === requestId) {
      return;
    }

    // if we're subscribed to a different request, we need to unsubscribe
    this.removeSubscriptions();

    // if we have a request, we need to subscribe to it
    if (requestId) {
      this._subscribedTo = requestId;
      this._subscription = this.store.notifications.subscribe(
        requestId,
        (_id: StableDocumentIdentifier, op: 'invalidated' | 'state' | 'added' | 'updated' | 'removed') => {
          // ignore subscription events that occur while our own component's request
          // is ocurring
          if (this.isUpdating) {
            return;
          }
          switch (op) {
            case 'invalidated': {
              // if we're subscribed to invalidations, we need to update
              if (this.autorefreshTypes.has('invalid')) {
                this.invalidated = true;
                this.maybeUpdate();
              }
              break;
            }
            case 'state': {
              const latest = this.store.requestManager._deduped.get(requestId);
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
                this.maybeUpdate('policy', true);
              } else {
                this.isRefreshing = true;
              }
            }
          }
        }
      );
    }
  }

  removeSubscriptions() {
    if (this._subscription) {
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
  installListeners() {
    if (typeof window === 'undefined') {
      return;
    }

    this.isOnline = window.navigator.onLine;
    this.unavailableStart = this.isOnline ? null : Date.now();
    this.isHidden = document.visibilityState === 'hidden';

    this.onlineChanged = (event: Event) => {
      this.isOnline = event.type === 'online';
      if (event.type === 'offline' && this.unavailableStart === null) {
        this.unavailableStart = Date.now();
      }
      this.maybeUpdate();
    };
    this.backgroundChanged = () => {
      const isHidden = document.visibilityState === 'hidden';
      this.isHidden = isHidden;

      if (isHidden && this.unavailableStart === null) {
        this.unavailableStart = Date.now();
      }

      this.maybeUpdate();
    };

    window.addEventListener('online', this.onlineChanged, { passive: true, capture: true });
    window.addEventListener('offline', this.onlineChanged, { passive: true, capture: true });
    document.addEventListener('visibilitychange', this.backgroundChanged, { passive: true, capture: true });
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
  maybeUpdate(mode?: 'reload' | 'refresh' | 'policy' | 'invalidated', silent?: boolean): void {
    if (this.isIdle) {
      return;
    }
    const canAttempt = Boolean(this.isOnline && !this.isHidden && (mode || this.autorefreshTypes.size));

    if (!canAttempt) {
      if (!silent && mode && mode !== 'invalidated') {
        throw new Error(`Reload not available: the network is not online or the tab is hidden`);
      }

      return;
    }

    const { autorefreshTypes } = this;
    let shouldAttempt = this.invalidated || Boolean(mode);

    if (!shouldAttempt && autorefreshTypes.has('online')) {
      const { unavailableStart } = this;
      const { autorefreshThreshold } = this.args;
      const deadline = typeof autorefreshThreshold === 'number' ? autorefreshThreshold : DEFAULT_DEADLINE;
      shouldAttempt = Boolean(unavailableStart && Date.now() - unavailableStart > deadline);
    }

    if (!shouldAttempt && autorefreshTypes.has('interval')) {
      const { intervalStart } = this;
      const { autorefreshThreshold } = this.args;

      if (intervalStart && typeof autorefreshThreshold === 'number' && autorefreshThreshold > 0) {
        shouldAttempt = Boolean(Date.now() - intervalStart >= autorefreshThreshold);
      }
    }

    this.unavailableStart = null;
    this.invalidated = false;

    if (shouldAttempt) {
      this.clearInterval();
      const request = Object.assign({}, this.reqState.request as unknown as RequestInfo<T, RT>);
      const realMode = mode === 'invalidated' ? null : mode;
      const val = realMode ?? this.args.autorefreshBehavior ?? 'policy';
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
        `Cannot supply a different store via context than was used to create the request`,
        !request.store || request.store === this.store
      );

      this.isUpdating = true;
      this._latestRequest = wasStoreRequest ? this.store.request(request) : this.store.requestManager.request(request);

      if (val !== 'refresh') {
        this._localRequest = this._latestRequest;
      }

      void this.scheduleInterval();
      void this._latestRequest.finally(() => {
        this.isUpdating = false;
      });
    } else {
      // TODO probably want this
      // void this.scheduleInterval();
    }
  }

  /**
   * Retry the request, reloading it from the server.
   *
   * @internal
   */
  retry = async () => {
    this.maybeUpdate('reload');
    await this._localRequest;
  };

  /**
   * Refresh the request, updating it in the background.
   *
   * @internal
   */
  refresh = async () => {
    this.maybeUpdate('refresh');
    await this._latestRequest;
  };

  @cached
  get errorFeatures() {
    return {
      isHidden: this.isHidden,
      isOnline: this.isOnline,
      retry: this.retry,
    };
  }

  @cached
  get contentFeatures() {
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

  willDestroy() {
    this.removeSubscriptions();

    if (typeof window === 'undefined') {
      return;
    }

    this.clearInterval();

    window.removeEventListener('online', this.onlineChanged, { passive: true, capture: true } as unknown as boolean);
    window.removeEventListener('offline', this.onlineChanged, { passive: true, capture: true } as unknown as boolean);
    document.removeEventListener('visibilitychange', this.backgroundChanged, {
      passive: true,
      capture: true,
    } as unknown as boolean);
  }

  @cached
  get _request(): Future<RT> {
    const { request, query } = this.args;
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
    return this.store.request<RT, T>(query);
  }

  @cached
  get request(): Future<RT> {
    const request = this._request;
    this.updateSubscriptions();
    return request;
  }

  get store(): Store {
    const store = this.args.store || this._store;
    assert(
      moduleExists('ember-provide-consume-context')
        ? `No store was provided to the <Request> component. Either provide a store via the @store arg or via the context API provided by ember-provide-consume-context.`
        : `No store was provided to the <Request> component. Either provide a store via the @store arg or by registering a store service.`,
      store
    );
    return store;
  }

  get reqState() {
    return getRequestState<RT, T>(this.request);
  }

  get result() {
    return this.reqState.result as RT;
  }

  <template>
    {{#if (and this.isIdle (has-block "idle"))}}
      {{yield to="idle"}}
    {{else if this.isIdle}}
      <Throw @error={{IdleBlockMissingError}} />
    {{else if this.reqState.isLoading}}
      {{yield this.reqState.loadingState to="loading"}}
    {{else if (and this.reqState.isCancelled (has-block "cancelled"))}}
      {{yield (notNull this.reqState.error) this.errorFeatures to="cancelled"}}
    {{else if (and this.reqState.isError (has-block "error"))}}
      {{yield (notNull this.reqState.error) this.errorFeatures to="error"}}
    {{else if this.reqState.isSuccess}}
      {{yield this.result this.contentFeatures to="content"}}
    {{else if (not this.reqState.isCancelled)}}
      <Throw @error={{(notNull this.reqState.error)}} />
    {{/if}}
    {{yield this.reqState to="always"}}
  </template>
}
