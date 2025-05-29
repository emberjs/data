/**
 * @module @warp-drive/ember
 */
import { assert } from '@warp-drive/build-config/macros';

import type { Future } from '../../../request.ts';
import type { StableDocumentIdentifier } from '../../../types/identifier';
import type { StructuredErrorDocument } from '../../../types/request.ts';
import type { ReactiveDocument } from '../document';
import type { RequestCacheRequestState } from './request-state';
import { getRequestState } from './request-state';

const RequestCache = new WeakMap<StableDocumentIdentifier, PaginationState>();

type FirstLink<T, RT, E> = {
  prev: null;
  self: Readonly<RequestCacheRequestState<RT, T, StructuredErrorDocument<E>>>;
  next: Link<T, RT, E> | PlaceholderLink<T, RT, E> | null;
  isVirtual: false;
};

type Link<T, RT, E> = {
  prev: Link<T, RT, E> | PlaceholderLink<T, RT, E> | FirstLink<T, RT, E>;
  self: Readonly<RequestCacheRequestState<RT, T, StructuredErrorDocument<E>>>;
  next: Link<T, RT, E> | PlaceholderLink<T, RT, E> | null;
  isVirtual: false;
};

type PlaceholderLink<T, RT, E> = {
  prev: Link<T, RT, E> | FirstLink<T, RT, E>;
  self: null;
  next: Link<T, RT, E>;
  isVirtual: true;
};

class PaginationState<T = unknown, RT extends ReactiveDocument<T[]> = ReactiveDocument<T[]>, E = unknown> {
  #pageList!: FirstLink<T, RT, E>;

  @tracked pages: ReactiveDocument<T[]>[] = [];
  @tracked data: T[] = [];

  constructor(request: Future<RT>) {
    this.#pageList = {
      prev: null,
      self: getRequestState(request),
      next: null,
      isVirtual: false,
    };
  }

  // TODO: pagination-utils Add loading state tracking to the ReactiveDocument interface
  @cached
  get isLoading() {
    return this.pages.some((page) => page.isLoading);
  }

  @cached
  get isSuccess() {
    return !this.isError;
  }

  // TODO: pagination-utils Add error state tracking to the ReactiveDocument interface
  @cached
  get isError() {
    return this.pages.some((page) => page.isError);
  }

  #addPage(page: ReactiveDocument<T[]>) {
    this.pages.push(page);
    if (page.data) {
      this.data = this.data.concat(page.data);
    }
  }

  async next() {
    const page = this.pages.at(-1);
    const result = await page?.next();
    if (result) {
      this.#addPage(result);
    }
  }
}

/**
 * Get the pagination state for a given request, this will return the same
 * PaginationState instance for the same request, even if the future is
 * a different instance based on the cache identity of the request.
 *
 * ```ts
 * import { getPaginationState } from '@warp-drive/ember';
 *
 * const future = store.request(query('user', { page: { size: 10 } }));
 * const state = getPaginationState(future);
 * ```
 *
 * @public
 * @static
 * @for @warp-drive/ember
 * @param future
 * @return {PaginationState}
 */
export function getPaginationState<T, RT extends ReactiveDocument<T[]>, E = unknown>(
  future: Future<RT>
): PaginationState<T, RT, E> {
  const lid = future.lid;
  assert(`Can only use getPaginationState with a cacheable request`, lid !== null);

  let state = RequestCache.get(lid) as PaginationState<T, RT, E> | undefined;

  if (!state) {
    state = new PaginationState(future);
    RequestCache.set(lid, state);
  }

  return state;
}
