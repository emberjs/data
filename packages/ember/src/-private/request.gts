import { assert } from '@ember/debug';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import { importSync, macroCondition, moduleExists } from '@embroider/macros';

import type Store from '@ember-data/store';

import { getRequestState } from './request-state';

let provide = service;
if (macroCondition(moduleExists('ember-provide-consume-context'))) {
  const { consume } = importSync('ember-provide-consume-context') as { consume: typeof service };
  provide = consume;
}

export class Throw extends Component {
  constructor(...args) {
    super(...args);
    throw this.args.error;
  }
  <template></template>
}

const and = (x: unknown, y: unknown) => x && y;

export class Request extends Component {
  @provide('store') declare _store: Store;

  @cached
  get request() {
    const { request, query } = this.args;
    assert(`Cannot use both @request and @query args with the <Request> component`, !request || !args);
    if (request) {
      return request;
    }
    if (query) {
      return this.store.request(query);
    }
  }

  get store() {
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
    return getRequestState(this.request);
  }

  <template>
    {{#if this.reqState.isLoading}}
      {{yield this.loadingState to="loading"}}
    {{else if (and this.reqState.isCancelled (has-block 'cancelled'))}}
      {{yield this.reqState.error to="cancelled" }}
    {{else if (and this.reqState.isError (has-block 'error'))}}
      {{yield this.reqState.error to="error" }}
    {{else if this.reqState.isSuccess}}
      {{yield this.reqState.result to="content"}}
    {{else}}
      <Throw @error={{this.reqState.error}} />
    {{/if}}
  </template>
}
