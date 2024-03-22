import { tracked } from '@glimmer/tracking';

import type { Awaitable } from '@ember-data/request';
import { getPromiseResult, setPromiseResult } from '@ember-data/request';

const PromiseCache = new WeakMap<Awaitable, PromiseState>();

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

export function getPromiseState<T = unknown, E = unknown>(promise: Promise<T> | Awaitable<T, E>): PromiseState<T, E> {
  let state = PromiseCache.get(promise) as PromiseState<T, E> | undefined;

  if (!state) {
    state = new PromiseState(promise);
    PromiseCache.set(promise, state);
  }

  return state;
}
