import { tracked } from '@glimmer/tracking';

import { PromiseCache } from '@ember-data/request';

const StateCache = new WeakMap();

class AsyncData<T = unknown> {
  @tracked isError = false;
  @tracked result: T | null = null;
  @tracked isPending = true;
  @tracked isFulfilled = false;

  constructor(promise, state?: { isError: boolean; result: T }) {
    if (state) {
      this.isError = state.isError;
      this.result = state.result;
      this.isPending = false;
      this.isFulfilled = true;
    }

    void promise.then(
      (result) => {
        this.result = result;
        this.isPending = false;
        this.isFulfilled = true;
      },
      (error) => {
        this.isError = true;
        this.result = error;
        this.isPending = false;
        this.isFulfilled = true;
      }
    );
  }
}

export function getPromiseState(promise) {
  let state = StateCache.get(promise);

  if (state) {
    return state;
  }

  const cache = PromiseCache.get(promise);
  state = new AsyncData(promise, cache);
  StateCache.set(promise, state);
  return state;
}
export function setupPromiseState() {}
