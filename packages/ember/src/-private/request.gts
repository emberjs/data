import { assert } from '@ember/debug';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import type { RequestInfo } from '@warp-drive/core-types/request';
import type { Future, StructuredErrorDocument } from '@ember-data/request';

import { importSync, macroCondition, moduleExists } from '@embroider/macros';

import type { StoreRequestInput } from '@ember-data/store';
import type Store from '@ember-data/store';

import { getRequestState } from './request-state.ts';
import type { RequestLoadingState } from './request-state.ts';
import { and, notNull, Throw } from './await.gts';
import { tracked } from '@glimmer/tracking';

const not = (x: unknown) => !x;
// default to 30 seconds unavailable before we refresh
const DEFAULT_DEADLINE = 30_000;

let provide = service;
if (macroCondition(moduleExists('ember-provide-consume-context'))) {
  const { consume } = importSync('ember-provide-consume-context') as { consume: typeof service };
  provide = consume;
}

interface RequestSignature<T> {
  Args: {
    request?: Future<T>;
    query?: StoreRequestInput;
    store?: Store;
    autoRefresh?: boolean;
    // second we must have been offline or hidden
    // before we would refresh
    autoRefreshTimeout?: number;
    autoRefreshBehavior?: 'refresh' | 'reload' | 'delegate';
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
    content: [value: T];
  };
}

export class Request<T> extends Component<RequestSignature<T>> {
  /**
   * @internal
   */
  @provide('store') declare _store: Store;
  @tracked isOnline: boolean = true;
  @tracked isHidden: boolean = true;
  @tracked _localRequest: Future<T> | undefined;
  declare unavailableStart: number | null;
  declare onlineChanged: (event: Event) => void;
  declare backgroundChanged: (event: Event) => void;
  declare _originalRequest: Future<T> | undefined;
  declare _originalQuery: StoreRequestInput | undefined;

  constructor(owner: unknown, args: RequestSignature<T>['Args']) {
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

  maybeUpdate(mode?: 'reload' | 'refresh' | 'delegate'): void {
    if (this.isOnline && !this.isHidden && (mode || this.args.autoRefresh)) {
      const deadline = this.args.autoRefreshTimeout ? this.args.autoRefreshTimeout * 1000 : DEFAULT_DEADLINE;
      const shouldAttempt = mode || (this.unavailableStart && Date.now() - this.unavailableStart > deadline);

      if (shouldAttempt) {
        const request = Object.assign({}, this.reqState.request as unknown as RequestInfo);
        const val = mode ?? this.args.autoRefreshBehavior ?? 'delegate';
        switch (val) {
          case 'reload':
            request.cacheOptions = Object.assign({}, request.cacheOptions, { reload: true });
            break;
          case 'refresh':
            request.cacheOptions = Object.assign({}, request.cacheOptions, { backgroundReload: true });
            break;
          case 'delegate':
            break;
          default:
            throw new Error(`Invalid ${mode ? 'update mode' : '@autoRefreshBehavior'} for <Request />: ${val}`);
        }

        this._localRequest = this.store.request<T>(request);
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

  @cached
  get errorFeatures() {
    return {
      isHidden: this.isHidden,
      isOnline: this.isOnline,
      retry: this.retry,
    };
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
    return this.store.request<T>(query);
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
    return getRequestState<T>(this.request);
  }

  <template>
    {{#if this.reqState.isLoading}}
      {{yield this.reqState.loadingState to="loading"}}
    {{else if (and this.reqState.isCancelled (has-block "cancelled"))}}
      {{yield (notNull this.reqState.error) this.errorFeatures to="cancelled"}}
    {{else if (and this.reqState.isError (has-block "error"))}}
      {{yield (notNull this.reqState.error) this.errorFeatures to="error"}}
    {{else if this.reqState.isSuccess}}
      {{yield (notNull this.reqState.result) to="content"}}
    {{else if (not this.reqState.isCancelled)}}
      <Throw @error={{(notNull this.reqState.error)}} />
    {{/if}}
  </template>
}
