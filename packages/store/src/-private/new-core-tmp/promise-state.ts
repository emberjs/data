import type { Awaitable } from '@ember-data/request';
import { getPromiseResult, setPromiseResult } from '@ember-data/request';

import { defineSignal } from './reactivity/signal';

const PromiseCache = new WeakMap<Awaitable, PromiseState>();

/**
 * The state of a promise in the "pending"
 * state. This is the default initial state.
 *
 * @typedoc
 */
export interface PendingPromise {
  /**
   * The status of the promise.
   *
   * @typedoc
   */
  status: 'pending';

  /**
   * Whether the promise is pending.
   *
   * @typedoc
   */
  isPending: true;

  /**
   * Whether the promise is pending.
   *
   * @deprecated use `isPending` instead
   * @typedoc
   */
  isLoading: true;

  /**
   * Whether the promise has resolved
   * successfully.
   *
   * @typedoc
   */
  isSuccess: false;

  /**
   * Whether the promise has rejected
   * with an error.
   *
   * @typedoc
   */
  isError: false;

  /**
   * Once the promise has resolved, this will
   * be the value the promise resolved to.
   *
   * @typedoc
   */
  value: null;
  /**
   * Once the promise has resolved, this will
   * be the value the promise resolved to.
   *
   * @deprecated use `value` instead
   * @typedoc
   */
  result: null;

  /**
   * Once the promise has rejected, this will
   * be the error the promise rejected with.
   *
   *
   * @deprecated use `reason` instead
   * @typedoc
   */
  error: null;

  /**
   * Once the promise has rejected, this will
   * be the error the promise rejected with.
   *
   * @typedoc
   */
  reason: null;
}

/**
 * The state of a promise in the "fulfilled" state.
 * This is the state of a promise that has resolved
 * successfully.
 *
 * @typedoc
 */
export interface ResolvedPromise<T> {
  /**
   * The status of the promise.
   *
   * @typedoc
   */
  status: 'fulfilled';

  /**
   * Whether the promise is pending.
   *
   * @typedoc
   */
  isPending: false;

  /**
   * Whether the promise is pending.
   *
   * @deprecated use `isPending` instead
   * @typedoc
   */
  isLoading: false;
  /**
   * Whether the promise has resolved
   * successfully.
   *
   * @typedoc
   */
  isSuccess: true;

  /**
   * Whether the promise has rejected
   * with an error.
   *
   * @typedoc
   */
  isError: false;

  /**
   * Once the promise has resolved, this will
   * be the value the promise resolved to.
   *
   * @typedoc
   */
  value: T;

  /**
   * Once the promise has resolved, this will
   * be the value the promise resolved to.
   *
   * @deprecated use `value` instead
   * @typedoc
   */
  result: T;

  /**
   * Once the promise has rejected, this will
   * be the error the promise rejected with.
   *
   *
   * @deprecated use `reason` instead
   * @typedoc
   */
  error: null;

  /**
   * Once the promise has rejected, this will
   * be the error the promise rejected with.
   *
   * @typedoc
   */
  reason: null;
}

/**
 * The state of a promise in the "rejected" state.
 * This is the state of a promise that has rejected
 * with an error.
 *
 * @typedoc
 */
export interface RejectedPromise<E> {
  /**
   * The status of the promise.
   *
   * @typedoc
   */
  status: 'rejected';

  /**
   * Whether the promise is pending.
   *
   * @typedoc
   */
  isPending: false;

  /**
   * Whether the promise is pending.
   *
   * @deprecated use `isPending` instead
   * @typedoc
   */
  isLoading: false;

  /**
   * Whether the promise has resolved
   * successfully.
   *
   * @typedoc
   */
  isSuccess: false;

  /**
   * Whether the promise has rejected
   * with an error.
   *
   * @typedoc
   */
  isError: true;

  /**
   * Once the promise has resolved, this will
   * be the value the promise resolved to.
   *
   * @typedoc
   */
  value: null;

  /**
   * Once the promise has resolved, this will
   * be the value the promise resolved to.
   *
   * @deprecated use `value` instead
   * @typedoc
   */
  result: null;

  /**
   * Once the promise has rejected, this will
   * be the error the promise rejected with.
   *
   *
   * @deprecated use `reason` instead
   * @typedoc
   */
  error: E;

  /**
   * Once the promise has rejected, this will
   * be the error the promise rejected with.
   *
   * @typedoc
   */
  reason: E;
}

/**
 * The state of a promise. This is the type that is returned
 * from `getPromiseState`.
 *
 * See also:
 * - {@link PendingPromise}
 * - {@link ResolvedPromise}
 * - {@link RejectedPromise}
 *
 * @typedoc
 */
export type PromiseState<T = unknown, E = unknown> = PendingPromise | ResolvedPromise<T> | RejectedPromise<E>;

const PromiseStateProto = {};

// TODO introduce a new mechanism for defining multiple properties
// that share a common signal
defineSignal(PromiseStateProto, 'reason', null);
defineSignal(PromiseStateProto, 'value', null);
defineSignal(PromiseStateProto, 'result', null);
defineSignal(PromiseStateProto, 'error', null);
defineSignal(PromiseStateProto, 'status', 'pending');
defineSignal(PromiseStateProto, 'isPending', true);
defineSignal(PromiseStateProto, 'isLoading', true);
defineSignal(PromiseStateProto, 'isSuccess', false);
defineSignal(PromiseStateProto, 'isError', false);

export function createPromiseState<T, E>(promise: Promise<T> | Awaitable<T, E>): Readonly<PromiseState<T, E>> {
  const state = getPromiseResult<T, E>(promise);
  const promiseState = Object.create(PromiseStateProto) as PromiseState<T, E>;

  if (state) {
    if (state.isError) {
      promiseState.error = state.result;
      promiseState.reason = state.result;
      promiseState.status = 'rejected';
      promiseState.isError = true;
      promiseState.isPending = false;
      promiseState.isLoading = false;
    } else {
      promiseState.result = state.result;
      promiseState.value = state.result;
      promiseState.status = 'fulfilled';
      promiseState.isSuccess = true;
      promiseState.isPending = false;
      promiseState.isLoading = false;
    }
  } else {
    void promise.then(
      (result) => {
        setPromiseResult(promise, { isError: false, result });
        promiseState.result = result;
        promiseState.value = result;
        promiseState.status = 'fulfilled';
        promiseState.isSuccess = true;
        promiseState.isPending = false;
        promiseState.isLoading = false;
      },
      (error: E) => {
        setPromiseResult(promise, { isError: true, result: error });
        promiseState.error = error;
        promiseState.reason = error;
        promiseState.status = 'rejected';
        promiseState.isError = true;
        promiseState.isPending = false;
        promiseState.isLoading = false;
      }
    );
  }

  return promiseState;
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
 * @typedoc
 */
export function getPromiseState<T = unknown, E = unknown>(
  promise: Promise<T> | Awaitable<T, E>
): Readonly<PromiseState<T, E>> {
  const _promise = getPromise(promise);
  let state = PromiseCache.get(_promise) as PromiseState<T, E> | undefined;

  if (!state) {
    state = createPromiseState(_promise);
    PromiseCache.set(_promise, state);
  }

  return state;
}
