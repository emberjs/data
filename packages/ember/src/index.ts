import { tracked } from '@glimmer/tracking';

import type { Future, StructuredDocument } from '@ember-data/request';
import { getPromiseResult, setPromiseResult } from '@ember-data/request';
import type Store from '@ember-data/store';

const StateCache = new WeakMap();
class AsyncData<T = unknown, E = unknown> {
  @tracked result: T | null = null;
  @tracked error: E | null = null;
  @tracked isPending = true;
  @tracked isSuccess = false;
  @tracked isError = false;

  constructor(promise: Promise<T>) {
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

export function getPromiseState<T>(promise: Promise<T>): AsyncData<T> {
  let state = StateCache.get(promise) as AsyncData<T> | undefined;

  if (!state) {
    state = new AsyncData(promise);
    StateCache.set(promise, state);
  }

  return state;
}

class Subscription<T = unknown, E = unknown> extends AsyncData<T, E> {
  #store!: Store;
  #request!: Future<StructuredDocument<T>>;

  constructor(store: Store, request: Future<T>) {
    super(request as Promise<StructuredDocument<T>>);
    this.#store = store;
    this.#request = request;
  }
}
