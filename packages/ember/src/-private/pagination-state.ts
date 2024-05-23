import { cached, tracked } from '@glimmer/tracking';

import type {
  Future,
  ImmutableRequestInfo,
  ResponseInfo,
  StructuredDocument,
  StructuredErrorDocument,
} from '@ember-data/request';
import type { Document } from '@ember-data/store';

import type { RequestState } from './request-state';
import { getRequestState } from './request-state';

const RequestCache = new WeakMap<Future<unknown>, PaginationState>();

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

export function getPaginationState<T, RT extends Document<T[]>>(future: Future<RT>): PaginationState<T, RT> {
  let state = RequestCache.get(future) as PaginationState<T, RT> | undefined;

  if (!state) {
    state = new PaginationState(future);
    RequestCache.set(future, state);
  }

  return state;
}
