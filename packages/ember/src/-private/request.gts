import { assert } from '@ember/debug';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { EnableHydration, type RequestInfo } from '@warp-drive/core-types/request';
import type { Future, StructuredErrorDocument } from '@ember-data/request';
import type { RequestState } from './request-state.ts';
import { importSync, macroCondition, moduleExists } from '@embroider/macros';

import type { StoreRequestInput } from '@ember-data/store';
import type Store from '@ember-data/store';

import { getRequestState } from './request-state.ts';
import type { RequestLoadingState } from './request-state.ts';
import { and, Throw } from './await.gts';
import { tracked } from '@glimmer/tracking';

function notNull<T>(x: null): never;
function notNull<T>(x: T): Exclude<T, null>;
function notNull<T>(x: T | null) {
  assert('Expected a non-null value, but got null', x !== null);
  return x;
}

const not = (x: unknown) => !x;
// default to 30 seconds unavailable before we refresh
const DEFAULT_DEADLINE = 30_000;

let provide = service;
if (macroCondition(moduleExists('ember-provide-consume-context'))) {
  const { consume } = importSync('ember-provide-consume-context') as { consume: typeof service };
  provide = consume;
}

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
    request?: Future<RT>;
    query?: StoreRequestInput<T, RT>;
    store?: Store;
    autorefresh?: boolean;
    autorefreshThreshold?: number;
    autorefreshBehavior?: 'refresh' | 'reload' | 'policy';
  };
  Blocks: {
    loading: [state: RequestLoadingState];
    cancelled: [
      error: StructuredErrorDocument,
      features: { isOnline: boolean; isHidden: boolean; retry: () => Promise<void> },
    ];
    error: [
      error: StructuredErrorDocument,
      features: { isOnline: boolean; isHidden: boolean; retry: () => Promise<void> },
    ];
    content: [value: RT, features: ContentFeatures<RT>];
    always: [state: RequestState<T, RT>];
  };
}

export class Request<T, RT> extends Component<RequestSignature<T, RT>> {
  /**
   * @internal
   */
  @provide('store') declare _store: Store;
  @tracked isOnline: boolean = true;
  @tracked isHidden: boolean = true;
  @tracked isRefreshing: boolean = false;
  @tracked _localRequest: Future<RT> | undefined;
  @tracked _latestRequest: Future<RT> | undefined;
  declare unavailableStart: number | null;
  declare onlineChanged: (event: Event) => void;
  declare backgroundChanged: (event: Event) => void;
  declare _originalRequest: Future<RT> | undefined;
  declare _originalQuery: StoreRequestInput<T, RT> | undefined;

  constructor(owner: unknown, args: RequestSignature<T, RT>['Args']) {
    super(owner, args);
    this.installListeners();
  }

  installListeners() {
    if (typeof window === 'undefined') {
      return;
    }

    this.isOnline = window.navigator.onLine;
    this.unavailableStart = this.isOnline ? null : Date.now();
    this.isHidden = document.visibilityState === 'hidden';

    this.onlineChanged = (event: Event) => {
      this.isOnline = event.type === 'online';
      if (event.type === 'offline') {
        this.unavailableStart = Date.now();
      }
      this.maybeUpdate();
    };
    this.backgroundChanged = () => {
      this.isHidden = document.visibilityState === 'hidden';
      this.maybeUpdate();
    };

    window.addEventListener('online', this.onlineChanged, { passive: true, capture: true });
    window.addEventListener('offline', this.onlineChanged, { passive: true, capture: true });
    document.addEventListener('visibilitychange', this.backgroundChanged, { passive: true, capture: true });
  }

  maybeUpdate(mode?: 'reload' | 'refresh' | 'policy'): void {
    if (this.isOnline && !this.isHidden && (mode || this.args.autorefresh)) {
      const deadline =
        typeof this.args.autorefreshThreshold === 'number' ? this.args.autorefreshThreshold : DEFAULT_DEADLINE;
      const shouldAttempt = mode || (this.unavailableStart && Date.now() - this.unavailableStart > deadline);
      this.unavailableStart = null;

      if (shouldAttempt) {
        const request = Object.assign({}, this.reqState.request as unknown as RequestInfo<T>);
        const val = mode ?? this.args.autorefreshBehavior ?? 'policy';
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
            throw new Error(`Invalid ${mode ? 'update mode' : '@autorefreshBehavior'} for <Request />: ${val}`);
        }

        const wasStoreRequest = (request as { [EnableHydration]: boolean })[EnableHydration] === true;
        assert(
          `Cannot supply a different store via context than was used to create the request`,
          !request.store || request.store === this.store
        );

        this._latestRequest = wasStoreRequest
          ? this.store.request<RT, T>(request)
          : this.store.requestManager.request<RT>(request);

        if (val !== 'refresh') {
          this._localRequest = this._latestRequest;
        }
      }
    }

    if (mode) {
      throw new Error(`Reload not available: the network is not online or the tab is hidden`);
    }
  }

  retry = async () => {
    this.maybeUpdate('reload');
    await this._localRequest;
  };

  refresh = async () => {
    this.isRefreshing = true;
    this.maybeUpdate('refresh');
    try {
      await this._latestRequest;
    } finally {
      this.isRefreshing = false;
    }
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
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('online', this.onlineChanged, { passive: true, capture: true } as unknown as boolean);
    window.removeEventListener('offline', this.onlineChanged, { passive: true, capture: true } as unknown as boolean);
    document.removeEventListener('visibilitychange', this.backgroundChanged, {
      passive: true,
      capture: true,
    } as unknown as boolean);
  }

  @cached
  get request() {
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
    return this.store.request<RT, T>(query!);
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
    {{#if this.reqState.isLoading}}
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
