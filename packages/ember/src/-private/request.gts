import { assert } from '@ember/debug';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import type { Future, StructuredErrorDocument } from '@ember-data/request';

import { importSync, macroCondition, moduleExists } from '@embroider/macros';

import type { StoreRequestInput } from '@ember-data/store';
import type Store from '@ember-data/store';

import { getRequestState } from './request-state.ts';
import type { RequestLoadingState } from './request-state.ts';
import { and, notNull, Throw } from './await.gts';

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
  };
  Blocks: {
    loading: [state: RequestLoadingState];
    cancelled: [error: StructuredErrorDocument];
    error: [error: StructuredErrorDocument];
    content: [value: T];
  };
}

export class Request<T> extends Component<RequestSignature<T>> {
  @provide('store') declare _store: Store;

  @cached
  get request() {
    const { request, query } = this.args;
    assert(`Cannot use both @request and @query args with the <Request> component`, !request || !query);
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
      {{yield (notNull this.reqState.error) to="cancelled"}}
    {{else if (and this.reqState.isError (has-block "error"))}}
      {{yield (notNull this.reqState.error) to="error"}}
    {{else if this.reqState.isSuccess}}
      {{yield (notNull this.reqState.result) to="content"}}
    {{else}}
      <Throw @error={{(notNull this.reqState.error)}} />
    {{/if}}
  </template>
}
