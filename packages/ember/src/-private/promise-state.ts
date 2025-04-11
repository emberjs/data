/**
 * @module @warp-drive/ember
 */
import { tracked } from '@glimmer/tracking';

import type { Awaitable } from '@ember-data/request';
import { getPromiseResult, setPromiseResult } from '@ember-data/request';

const PromiseCache = new WeakMap<Awaitable, PromiseState>();

/**
 * PromiseState provides a reactive wrapper for a promise which allows you write declarative
 * code around a promise's control flow. It is useful in both Template and JavaScript contexts,
 * allowing you to quickly derive behaviors and data from pending, error and success states.
 *
 * ```ts
 * interface PromiseState<T = unknown, E = unknown> {
 *   isPending: boolean;
 *   isSuccess: boolean;
 *   isError: boolean;
 *   result: T | null;
 *   error: E | null;
 * }
 * ```
 *
 * To get the state of a promise, use `getPromiseState`.
 *
 * @class PromiseState
 * @public
 */
export class PromiseState<T = unknown, E = unknown> {
  @tracked result: T | null = null;
  @tracked error: E | null = null;
  @tracked isPending = true;
  @tracked isSuccess = false;
  @tracked isError = false;

  constructor(promise: Promise<T> | Awaitable<T, E>) {
    const state = getPromiseResult<T, E>(promise);

    if (state) {
      if (state.isError) {
        this.error = state.result;
        this.isError = true;
        this.isPending = false;
      } else {
        this.result = state.result;
        this.isSuccess = true;
        this.isPending = false;
      }
    } else {
      void promise.then(
        (result) => {
          setPromiseResult(promise, { isError: false, result });
          this.result = result;
          this.isSuccess = true;
          this.isPending = false;
        },
        (error: E) => {
          setPromiseResult(promise, { isError: true, result: error });
          this.error = error;
          this.isError = true;
          this.isPending = false;
        }
      );
    }
  }
}

const LegacyPromiseProxy = Symbol.for('LegacyPromiseProxy');
type LegacyAwaitable<T, E> = { promise: Promise<T> | Awaitable<T, E>; [LegacyPromiseProxy]: true };

function isLegacyAwaitable<T, E>(promise: object): promise is LegacyAwaitable<T, E> {
  return LegacyPromiseProxy in promise && 'promise' in promise && promise[LegacyPromiseProxy] === true;
}

function getPromise<T, E>(promise: Promise<T> | Awaitable<T, E> | LegacyAwaitable<T, E>): Promise<T> | Awaitable<T, E> {
  return isLegacyAwaitable(promise) ? promise.promise : promise;
}

/**
 * Returns a reactive state-machine for the provided promise or awaitable.
 *
 * Repeat calls to `getPromiseState` with the same promise will return the same state object
 * making is safe and easy to use in templates and JavaScript code to produce reactive
 * behaviors around promises.
 *
 * `getPromiseState` can be used in both JavaScript and Template contexts.
 *
 * ```ts
 * import { getPromiseState } from '@warp-drive/ember';
 *
 * const state = getPromiseState(promise);
 * ```
 *
 * For instance, we could write a getter on a component that updates whenever
 * the promise state advances or the promise changes, by combining the function
 * with the use of `@cached`
 *
 * ```ts
 * class Component {
 *   @cached
 *   get title() {
 *     const state = getPromiseState(this.args.request);
 *     if (state.isPending) {
 *       return 'loading...';
 *     }
 *     if (state.isError) { return null; }
 *     return state.result.title;
 *   }
 * }
 * ```
 *
 * Or in a template as a helper:
 *
 * ```gjs
 * import { getPromiseState } from '@warp-drive/ember';
 *
 * <template>
 *   {{#let (getPromiseState @request) as |state|}}
 *     {{#if state.isPending}} <Spinner />
 *     {{else if state.isError}} <ErrorForm @error={{state.error}} />
 *     {{else}}
 *       <h1>{{state.result.title}}</h1>
 *     {{/if}}
 *   {{/let}}
 * </template>
 * ```
 *
 * If looking to use in a template, consider also the `<Await />` component.
 *
 * @method getPromiseState
 * @for @warp-drive/ember
 * @static
 * @public
 * @param {Promise<T> | Awaitable<T, E>} promise
 * @return {PromiseState<T, E>}
 */
export function getPromiseState<T = unknown, E = unknown>(promise: Promise<T> | Awaitable<T, E>): PromiseState<T, E> {
  const _promise = getPromise(promise);
  let state = PromiseCache.get(_promise) as PromiseState<T, E> | undefined;

  if (!state) {
    state = new PromiseState(_promise);
    PromiseCache.set(_promise, state);
  }

  return state;
}
