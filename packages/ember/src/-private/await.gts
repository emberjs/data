import { assert } from '@ember/debug';
import Component from '@glimmer/component';
import { getPromiseState } from './promise-state.ts';
import { Awaitable } from '@ember-data/request';

export function notNull<T>(x: null): never;
export function notNull<T>(x: T): Exclude<T, null>;
export function notNull<T>(x: T | null) {
  assert('Expected a non-null value, but got null', x !== null);
  return x;
}
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

  <template>
    {{#if this.state.isPending}}
      {{yield to="pending"}}
    {{else if (and this.state.isError (has-block "error"))}}
      {{yield (notNull this.state.error) to="error"}}
    {{else if this.state.isSuccess}}
      {{yield (notNull this.state.result) to="success"}}
    {{else}}
      <Throw @error={{(notNull this.state.error)}} />
    {{/if}}
  </template>
}
