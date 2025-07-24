/**
 * @module @warp-drive/ember
 */
import { assert } from '@warp-drive/core/build-config/macros';
import { ReactiveDocument } from '../../../reactive/-private/document.ts';
import type { Future } from '../../../request.ts';
import type { StructuredErrorDocument } from '../../../types/request.ts';
import { Link } from '../../../types/spec/json-api-raw.ts';
import { defineSignal, memoized } from './reactivity/signal';
import { getRequestState, RequestCacheRequestState } from './request-state.ts';

const PaginationCache = new WeakMap<Future<unknown>, PaginationState>();

function getHref(link?: Link | null): string | null {
  if (!link) {
    return null;
  }
  if (typeof link === 'string') {
    return link;
  }
  return link.href;
}

type PageStateCreateOptions = {
  self: Future<unknown> | string;
  prev?: string | null;
  next?: string | null;
};

export class PageState<RT = unknown, T = unknown, E = unknown> {
  declare manager: PaginationState<RT, T, E>;
  declare request: Future<RT> | null;
  declare state: Readonly<RequestCacheRequestState<RT, T, StructuredErrorDocument<E>>>;
  declare selfLink: string | null;
  declare _prevLink: string | null;
  declare _nextLink: string | null;

  constructor(manager: PaginationState<RT, T, E>, options: PageStateCreateOptions) {
    this.manager = manager;
    this._prevLink = options.prev ?? null;
    this._nextLink = options.next ?? null;
    if (typeof options.self === 'string') {
      this.selfLink = options.self;
    } else {
      this.load(options.self as Future<RT>);
      options.self.then((value) => {
        const content = value.content as ReactiveDocument<RT[]>;
        const url = getHref(content?.links?.self);
        assert('Expected the page to have a self link', url);
        this.selfLink = url;
        this.manager.pagesCache.set(this.selfLink, this);
      });
    }
  }

  @memoized
  get value(): ReactiveDocument<RT[]> | null {
    return this.state?.value as ReactiveDocument<RT[]>;
  }

  @memoized
  get isLoading(): boolean {
    return Boolean(this.state?.isLoading);
  }

  @memoized
  get isSuccess(): boolean {
    return Boolean(this.state?.isSuccess);
  }

  @memoized
  get isError(): boolean {
    return Boolean(this.state?.isError);
  }

  @memoized
  get prevLink(): string | null {
    return getHref(this.value?.links?.prev) ?? this._prevLink;
  }

  @memoized
  get nextLink(): string | null {
    return getHref(this.value?.links?.next) ?? this._nextLink;
  }

  @memoized
  get prev(): PageState<RT, T, E> | null {
    const url = this.prevLink;
    return url ? this.manager.getPageState({ self: url, next: this.selfLink }) : null;
  }

  @memoized
  get next(): PageState<RT, T, E> | null {
    const url = this.nextLink;
    return url ? this.manager.getPageState({ self: url, prev: this.selfLink }) : null;
  }

  load = (request: Future<unknown>): void => {
    this.request = request as Future<RT>;
    this.state = getRequestState<RT, T, E>(this.request);
  };
}

defineSignal(PageState.prototype, 'request', undefined);
defineSignal(PageState.prototype, 'state', undefined);
defineSignal(PageState.prototype, 'self', undefined);

export class PaginationState<RT = unknown, T = unknown, E = unknown> {
  declare initialPage: Readonly<PageState<RT, T, E>>;
  declare activePage: Readonly<PageState<RT, T, E>>;
  declare pagesCache: Map<string, PageState>;

  constructor(request: Future<RT>) {
    this.pagesCache = new Map<string, PageState>();
    this.initialPage = new PageState<RT, T, E>(this, { self: request });
    this.activePage = this.initialPage;
  }

  @memoized
  get isLoading(): boolean {
    return this.initialPage.isLoading;
  }

  @memoized
  get isSuccess(): boolean {
    return this.initialPage.isSuccess;
  }

  @memoized
  get isError(): boolean {
    return this.initialPage.isError;
  }

  @memoized
  get firstPage(): Readonly<PageState<RT, T, E>> {
    let page = this.activePage;
    while (page && page.prev) {
      page = page.prev;
    }
    return page;
  }

  @memoized
  get lastPage(): Readonly<PageState<RT, T, E>> {
    let page = this.activePage;
    while (page && page.next) {
      page = page.next;
    }
    return page;
  }

  @memoized
  get prevPages(): Readonly<PageState<RT, T, E>[]> {
    let pages = [];
    let page = this.activePage?.prev;
    while (page) {
      pages.unshift(page);
      page = page.prev;
    }
    return pages;
  }

  @memoized
  get nextPages(): Readonly<PageState<RT, T, E>[]> {
    let pages = [];
    let page = this.activePage?.next;
    while (page) {
      pages.push(page);
      page = page.next;
    }
    return pages;
  }

  @memoized
  get pages(): Readonly<PageState<RT, T, E>[]> {
    if (!this.activePage) return [];

    return [...this.prevPages, this.activePage, ...this.nextPages];
  }

  @memoized
  get data(): RT[] {
    if (!this.pages) return [];

    return this.pages.reduce((acc, page) => {
      const content = page.value;
      if (content?.data) {
        return [...acc, ...content.data];
      }
      return acc;
    }, [] as RT[]);
  }

  @memoized
  get prev(): string | null {
    return this.firstPage.selfLink;
  }

  @memoized
  get next(): string | null {
    return this.lastPage.selfLink;
  }

  @memoized
  get prevRequest(): Future<RT> | null {
    if (!this.firstPage) return null;

    return this.firstPage.request;
  }

  @memoized
  get nextRequest(): Future<RT> | null {
    if (!this.lastPage) return null;

    return this.lastPage.request;
  }

  activatePage = (page: Readonly<PageState<RT, T, E>>): void => {
    this.activePage = page;
  };

  getPageState = (options: PageStateCreateOptions): Readonly<PageState<RT, T, E>> => {
    const url = typeof options.self === 'string' ? options.self : options.self.toString();
    let state = this.pagesCache.get(url);

    if (!state) {
      state = new PageState<RT, T, E>(this, options);
      this.pagesCache.set(url, state);
    }

    return state as Readonly<PageState<RT, T, E>>;
  };
}

defineSignal(PaginationState.prototype, 'initialPage', undefined);
defineSignal(PaginationState.prototype, 'activePage', undefined);

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
export function getPaginationState<RT, T, E>(
  future: Future<RT>
): Readonly<PaginationState<RT, T, StructuredErrorDocument<E>>> {
  let state = PaginationCache.get(future);

  if (!state) {
    state = new PaginationState<RT, T, E>(future);
    PaginationCache.set(future, state);
  }

  return state as Readonly<PaginationState<RT, T, StructuredErrorDocument<E>>>;
}
