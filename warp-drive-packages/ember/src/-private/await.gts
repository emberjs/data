import type Owner from '@ember/owner';
import Component from '@glimmer/component';

import type { Awaitable } from '@warp-drive/core/request';
import { getPromiseState } from '@warp-drive/core/store/-private';

export const and = (x: unknown, y: unknown) => Boolean(x && y);
interface ThrowSignature<E = Error | string | object> {
  Args: {
    error: E;
  };
}

/**
 * The `<Throw />` component is used to throw an error in a template.
 *
 * That's all it does. So don't use it unless the application should
 * throw an error if it reaches this point in the template.
 *
 * ```hbs
 * <Throw @error={{anError}} />
 * ```
 *
 * @class <Throw />
 * @public
 */
export class Throw<T> extends Component<ThrowSignature<T>> {
  constructor(owner: Owner, args: ThrowSignature<T>['Args']) {
    super(owner, args);
    // this error is opaque (user supplied) so we don't validate it
    // as an Error instance.
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
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

/**
 * The <Await /> component allow you to utilize reactive control flow
 * for asynchronous states in your application.
 *
 * Await is ideal for handling "boundaries", outside which some state is
 * still allowed to be unresolved and within which it MUST be resolved.
 *
 * ```gjs
 * import { Await } from '@warp-drive/ember';
 *
 * <template>
 *   <Await @promise={{@request}}>
 *     <:pending>
 *       <Spinner />
 *     </:pending>
 *
 *     <:error as |error|>
 *       <ErrorForm @error={{error}} />
 *     </:error>
 *
 *     <:success as |result|>
 *       <h1>{{result.title}}</h1>
 *     </:success>
 *   </Await>
 * </template>
 * ```
 *
 * The <Await /> component requires that error states are properly handled.
 *
 * If no error block is provided and the promise rejects, the error will
 * be thrown.
 *
 * @class <Await />
 * @public
 */
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
