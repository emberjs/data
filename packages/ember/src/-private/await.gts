import Component from '@glimmer/component';
import { getPromiseState } from './promise-state.ts';
import { Awaitable } from '@ember-data/request';

export const and = (x: unknown, y: unknown) => Boolean(x && y);
interface ThrowSignature<E = Error | string | object> {
  Args: {
    error: E;
  };
}

export class Throw<T> extends Component<ThrowSignature<T>> {
  constructor(owner: unknown, args: ThrowSignature<T>['Args']) {
    super(owner, args);
    throw this.args.error;
  }
  <template></template>
}

interface AwaitSignature<T, E = Error | string | object> {
  Args: {
    promise: Promise<T> | Awaitable<T, E>;
  };
  Blocks: {
    pending: [];
    error: [error: E];
    success: [value: T];
  };
}

export class Await<T, E> extends Component<AwaitSignature<T, E>> {
  get state() {
    return getPromiseState<T, E>(this.args.promise);
  }

  get error() {
    return this.state.error as E;
  }

  get result() {
    return this.state.result as T;
  }

  <template>
    {{#if this.state.isPending}}
      {{yield to="pending"}}
    {{else if (and this.state.isError (has-block "error"))}}
      {{yield this.error to="error"}}
    {{else if this.state.isSuccess}}
      {{yield this.result to="success"}}
    {{else}}
      <Throw @error={{this.error}} />
    {{/if}}
  </template>
}
