/**
 * @module @warp-drive/ember
 */
import { cached, tracked } from '@glimmer/tracking';

import type {
  Future,
  ImmutableRequestInfo,
  ResponseInfo,
  StructuredDocument,
  StructuredErrorDocument,
} from '@ember-data/request';
import type { Document } from '@ember-data/store';
import { assert } from '@warp-drive/build-config/macros';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';

import type { RequestState } from './request-state';
import { getRequestState } from './request-state';

const RequestCache = new WeakMap<StableDocumentIdentifier, PaginationState>();

type FirstLink<T, RT> = {
  prev: null;
  self: RequestState<T, RT>;
  next: Link<T, RT> | PlaceholderLink<T, RT> | null;
  isVirtual: false;
};

type Link<T, RT> = {
  prev: Link<T, RT> | PlaceholderLink<T, RT> | FirstLink<T, RT>;
  self: RequestState<T, RT>;
  next: Link<T, RT> | PlaceholderLink<T, RT> | null;
  isVirtual: false;
};

type PlaceholderLink<T, RT> = {
  prev: Link<T, RT> | FirstLink<T, RT>;
  self: null;
  next: Link<T, RT>;
  isVirtual: true;
};

class PaginationState<T = unknown, RT extends Document<T[]> = Document<T[]>> {
  #pageList!: FirstLink<T>;

  @tracked pages: Document<T[]>[] = [];
  @tracked data: T[] = [];

  constructor(request: Future<RT>) {
    this.#pageList = {
      prev: null,
      self: getRequestState(request),
      next: null,
      isVirtual: false,
    };
  }

  @cached
  get isLoading() {
    return this.pages.some((page) => page.isLoading);
  }

  @cached
  get isSuccess() {
    return !this.isError;
  }

  @cached
  get isError() {
    return this.pages.some((page) => page.isError);
  }

  #addPage(page: Document<T[]>) {
    this.pages.push(page);
    this.data = this.data.concat(page.data!);
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
export function getPaginationState<T, RT extends Document<T[]>>(future: Future<RT>): PaginationState<T, RT> {
  const lid = future.lid;
  assert(`Can only use getPaginationState with a cacheable request`, lid !== null);

  let state = RequestCache.get(lid) as PaginationState<T, RT> | undefined;

  if (!state) {
    state = new PaginationState(future);
    RequestCache.set(lid, state);
  }

  return state;
}
