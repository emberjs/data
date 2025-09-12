/**
 * @module @warp-drive/ember
 */
import { assert } from '@warp-drive/core/build-config/macros';
import { ReactiveDocument } from '../../../reactive/-private/document.ts';
import type { Future } from '../../../request.ts';
import type { StructuredErrorDocument } from '../../../types/request.ts';
import { Link } from '../../../types/spec/json-api-raw.ts';
import { memoized, signal } from './reactivity/signal';
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

export class PageState<RT = unknown, E = unknown> {
  declare manager: PaginationState<RT, E>;
  @signal declare request: Future<RT> | null;
  @signal declare state: Readonly<RequestCacheRequestState<RT, StructuredErrorDocument<E>>>;
  @signal declare selfLink: string | null;
  @signal declare prevLink: string | null;
  @signal declare nextLink: string | null;

  constructor(manager: PaginationState<RT, E>, futureOrLink: Future<RT> | string) {
    this.manager = manager;
    if (typeof futureOrLink === 'string') {
      this.selfLink = futureOrLink;
    } else {
      this.load(futureOrLink);
    }
  }

  @memoized
  get value(): ReactiveDocument<RT> | null {
    return this.state?.value as ReactiveDocument<RT>;
  }

  @memoized
  get data(): RT[] | null {
    return this.value?.data as RT[];
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
  get isCancelled(): boolean {
    return Boolean(this.state?.isCancelled);
  }

  @memoized
  get isError(): boolean {
    return Boolean(this.state?.isError);
  }

  @memoized
  get reason(): StructuredErrorDocument<E> | null {
    return this.state?.reason;
  }

  @memoized
  get prev(): PageState<RT, E> | null {
    const url = this.prevLink;
    return url ? this.manager.getPageState(url) : null;
  }

  @memoized
  get next(): PageState<RT, E> | null {
    const url = this.nextLink;
    return url ? this.manager.getPageState(url) : null;
  }

  load = async (request: Future<unknown>): Promise<void> => {
    try {
      this.request = request as Future<RT>;
      this.state = getRequestState<RT, E>(this.request);
      const value = await this.request;
      const content = value.content as ReactiveDocument<RT[]>;

      const self = getHref(content?.links?.self) as string | null;
      assert('Expected the page to have a self link', self);

      // Ensure the page is cached under its self link when it's loaded only with a future
      if (!this.selfLink || !this.manager.getPageState(self)) {
        this.selfLink = self;
        this.manager.pagesCache.set(this.selfLink, this);
      }

      const next = getHref(content?.links?.next);
      if (next) {
        this.nextLink = next;
        const nextPage = this.manager.getPageState(next);
        nextPage.updateLinks({ prev: self });
      }

      const prev = getHref(content?.links?.prev);
      if (prev) {
        const prevPage = this.manager.getPageState(prev);
        this.prevLink = prev;
        prevPage.updateLinks({ next: self });
      }
    } catch {}
  };

  updateLinks = ({ prev, next }: { prev?: string | null; next?: string | null }): void => {
    if (prev) {
      this.prevLink = prev;
    }
    if (next) {
      this.nextLink = next;
    }
  };
}

export class PaginationState<RT = unknown, E = unknown> {
  @signal declare initialPage: Readonly<PageState<RT, E>>;
  @signal declare activePage: Readonly<PageState<RT, E>>;
  declare pagesCache: Map<string, PageState>;

  constructor(request: Future<RT>) {
    this.pagesCache = new Map<string, PageState>();
    this.initialPage = new PageState<RT, E>(this, request);
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
  get firstPage(): Readonly<PageState<RT, E>> {
    let page = this.activePage;
    while (page && page.prev) {
      page = page.prev;
    }
    return page;
  }

  @memoized
  get lastPage(): Readonly<PageState<RT, E>> {
    let page = this.activePage;
    while (page && page.next) {
      page = page.next;
    }
    return page;
  }

  @memoized
  get prevPages(): Readonly<PageState<RT, E>[]> {
    let pages = [];
    let page = this.activePage?.prev;
    while (page) {
      pages.unshift(page);
      page = page.prev;
    }
    return pages;
  }

  @memoized
  get nextPages(): Readonly<PageState<RT, E>[]> {
    let pages = [];
    let page = this.activePage?.next;
    while (page) {
      pages.push(page);
      page = page.next;
    }
    return pages;
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
  get activePageRequest(): Future<RT> | null {
    return this.activePage.request;
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

  @memoized
  get startingPage(): Readonly<PageState<RT, E>> {
    let page = this.activePage;
    while (page.prev) {
      page = page.prev;
    }
    return page;
  }

  activatePage = (page: Readonly<PageState<unknown, unknown>>): void => {
    this.activePage = page as Readonly<PageState<RT, E>>;
  };

  getPageState = (futureOrLink: Future<unknown> | string): Readonly<PageState<RT, E>> => {
    const url = typeof futureOrLink === 'string' ? futureOrLink : futureOrLink.toString();
    let state = this.pagesCache.get(url);

    if (!state) {
      state = new PageState<RT, E>(this, futureOrLink as Future<RT>);
      this.pagesCache.set(url, state);
    }

    return state as Readonly<PageState<RT, E>>;
  };

  @memoized
  get pages(): Iterable<Readonly<PageState<RT, E>>> {
    let self = this;
    return {
      *[Symbol.iterator]() {
        let page: Readonly<PageState<RT, E>> | null = self.startingPage;
        while (page) {
          yield page;
          page = page.next;
        }
      },
    };
  }

  @memoized
  get data(): Iterable<RT> {
    let self = this;
    return {
      *[Symbol.iterator]() {
        let page: Readonly<PageState<RT, E>> | null = self.startingPage;
        while (page) {
          if (page.data) {
            for (const item of page.data) {
              yield item;
            }
          }
          page = page.next;
        }
      },
    };
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
export function getPaginationState<RT, E>(
  future: Future<RT>
): Readonly<PaginationState<RT, StructuredErrorDocument<E>>> {
  let state = PaginationCache.get(future);

  if (!state) {
    state = new PaginationState<RT, E>(future);
    PaginationCache.set(future, state);
  }

  return state as Readonly<PaginationState<RT, StructuredErrorDocument<E>>>;
}
