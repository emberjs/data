import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { service } from '@ember/service';

import { importSync, macroCondition, moduleExists } from '@embroider/macros';

import type { Document, Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import type { Future } from '@warp-drive/core/request';
import { getPaginationState, createPaginationSubscription, DISPOSE } from '@warp-drive/core/store/-private';
import type { PaginationState, Page } from '@warp-drive/core/store/-private';
import type { StructuredErrorDocument } from '@warp-drive/core/types/request';

import { Request } from './request.gts';
import { and, Throw } from './await.gts';

function notNull(x: null): never;
function notNull<T>(x: T): Exclude<T, null>;
function notNull<T>(x: T | null) {
  assert('Expected a non-null value, but got null', x !== null);
  return x;
}

const not = (x: unknown) => !x;
const IdleBlockMissingError = new Error(
  'No idle block provided for <Request> component, and no query or request was provided.'
);

let consume = service;
if (macroCondition(moduleExists('ember-provide-consume-context'))) {
  const { consume: contextConsume } = importSync('ember-provide-consume-context') as { consume: typeof service };
  consume = contextConsume;
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

interface PaginateSignature<RT, T, E> {
  Args: {
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
     * The store instance to use for making requests. If contexts are available,
     * the component will default to using the `store` on the context.
     *
     * This is required if the store is not available via context or should be
     * different from the store provided via context.
     *
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
  };
  Blocks: {
    /**
     * The block to render when the component is idle and waiting to be given a request.
     *
     */
    idle: [];

    /**
     * The block to render when the request is loading.
     *
     */
    loading: [state: RequestLoadingState];

    /**
     * The block to render when the request was cancelled.
     *
     */
    cancelled: [
      error: StructuredErrorDocument<E>,
      features: { isOnline: boolean; isHidden: boolean; retry: () => Promise<void> },
    ];

    /**
     * The block to render when the request failed. If this block is not provided,
     * the error will be rethrown.
     *
     * Thus it is required to provide an error block and proper error handling if
     * you do not want the error to crash the application.
     *
     */
    error: [
      error: StructuredErrorDocument<E>,
      features: { isOnline: boolean; isHidden: boolean; retry: () => Promise<void> },
    ];

    /**
     * The block to render when the request succeeded.
     *
     */
    content: [state: PaginationState<RT, T, StructuredErrorDocument<E>>, features: ContentFeatures<RT>];
    always: [state: PaginationState<RT, T, StructuredErrorDocument<E>>];
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
export class Paginate<RT, T, E> extends Component<PaginateSignature<RT, T, E>> {
  /**
   * The store instance to use for making requests. If contexts are available, this
   * will be the `store` on the context, else it will be the store service.
   *
   * @internal
   */
  @consume('store') declare _store: Store;

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

  _state: PaginationSubscription<RT, T, E> | null = null;
  get state(): PaginationSubscription<RT, T, E> {
    let { _state } = this;
    const { store } = this;
    if (_state && _state.store !== store) {
      _state[DISPOSE]();
      _state = null;
    }

    if (!_state) {
      this._state = _state = createPaginationSubscription(store, this.args);
    }

    return _state;
  }

  willDestroy(): void {
    this._state![DISPOSE]();
    this._state = null;
  }

  get initialState(): Readonly<PaginationState<RT, T, E>> {
    return this.state.initialPage.state;
  }

  get activePageRequest(): Future<RT> | null {
    return this.state.activePage?.request || null;
  }

  @cached
  get pages(): Page<RT, T, E>[] {
    return this.state.pages;
  }

  @cached
  get data(): T[] {
    return this.state.data;
  }

  @cached
  get hasPrev(): boolean {
    return Boolean(this.state.prev);
  }

  @cached
  get hasNext(): boolean {
    return Boolean(this.state.next);
  }

  @cached
  get prevRequest(): Future<RT> | null {
    return this.state.prevRequest;
  }

  @cached
  get nextRequest(): Future<RT> | null {
    return this.state.nextRequest;
  }

  <template>
    {{#if (and this.state.isIdle (has-block "idle"))}}
      {{yield to="idle"}}

    {{else if this.state.isIdle}}
      <Throw @error={{IdleBlockMissingError}} />

    {{else if this.state.paginationState.isLoading}}
      {{yield this.state.paginationState.loadingState to="loading"}}

    {{else if (and this.state.paginationState.isCancelled (has-block "cancelled"))}}
      {{yield (notNull this.state.paginationState.reason) this.state.errorFeatures to="cancelled"}}

    {{else if (and this.state.paginationState.isError (has-block "error"))}}
      {{yield (notNull this.state.paginationState.reason) this.state.errorFeatures to="error"}}

    {{else if this.state.paginationState.isSuccess}}
      {{yield this.state.paginationState this.state.contentFeatures to="content"}}

    {{else if (not this.state.paginationState.isCancelled)}}
      <Throw @error={{(notNull this.state.paginationState.reason)}} />
    {{/if}}

    {{yield this.state.paginationState this.state.contentFeatures to="always"}}
  </template>
}
